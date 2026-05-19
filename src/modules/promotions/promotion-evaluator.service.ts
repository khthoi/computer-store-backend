import { Injectable, BadRequestException } from '@nestjs/common';
import { Promotion } from './entities/promotion.entity';
import { PromotionCondition, ConditionType, ConditionOperator } from './entities/promotion-condition.entity';
import { PromotionAction, ActionType } from './entities/promotion-action.entity';
import { PromotionScope, ScopeType } from './entities/promotion-scope.entity';
import { BulkTier } from './entities/bulk-tier.entity';
import { BulkComponent } from './entities/bulk-component.entity';
import { CartItemDto } from './dto/apply-coupon.dto';
import { PromotionsService } from './promotions.service';
import {
  AppliedPromotionDto,
  BundleComponentInfo,
  BxgyInfo,
  PromotionActionKind,
  PromotionScopeKind,
  PromotionStatusKind,
} from '../cart/dto/cart-response.dto';

export interface EvaluationContext {
  items: CartItemDto[];
  subtotal: number;
  customerId: number;
  isFirstOrder: boolean;
  paymentMethod?: string;
  platform?: string;
  categoryIds?: number[];
  brandIds?: number[];
  /** Per-variant lookup: productId / categoryId — used by bundle/BXGY scope rules. */
  productByVariant?: Map<number, { productId: number; categoryId: number | null }>;
  /** Raw shipping fee before promotion. Set by checkout; cart can omit (treated as 0). */
  shippingFee?: number;
}

export interface DiscountResult {
  promotionId: number;
  promotionName: string;
  discountAmount: number;
  isCoupon: boolean;
}

@Injectable()
export class PromotionEvaluatorService {
  constructor(private readonly promotionsService: PromotionsService) {}

  /**
   * Checkout-side single-promotion evaluator. Returns a typed effect indicating
   * how the promotion should be materialised (free shipping, bundle, BXGY gift,
   * or generic discount). Null when conditions/scope fail or net effect = 0.
   */
  async evaluateSinglePromotion(
    promo: Promotion,
    ctx: EvaluationContext,
  ): Promise<{
    kind: 'free_shipping' | 'bundle' | 'bxgy' | 'other';
    promotionId: number;
    promotionName: string;
    discountAmount: number;
    gift?: { productId: number; getQty: number; pct: number };
  } | null> {
    if (!this.checkScope(promo.scopes, ctx)) return null;
    if (!this.checkConditions(promo.conditions, ctx)) return null;
    const action = (promo.actions ?? [])[0];
    if (!action) return null;
    if (action.actionType === ActionType.FREE_SHIPPING) {
      const amount = Math.max(0, Math.round(ctx.shippingFee ?? 0));
      if (amount <= 0) return null;
      return { kind: 'free_shipping', promotionId: promo.id, promotionName: promo.name, discountAmount: amount };
    }
    if (action.actionType === ActionType.BUNDLE_DISCOUNT) {
      const discount = this.applyBundleDiscount(action, ctx);
      if (discount <= 0) return null;
      return { kind: 'bundle', promotionId: promo.id, promotionName: promo.name, discountAmount: discount };
    }
    if (action.actionType === ActionType.BXGY) {
      const applications = this.countBxgyApplications(action, ctx);
      if (applications <= 0) return null;
      const giftProductId = action.bxgyGetProductId ? Number(action.bxgyGetProductId) : null;
      if (giftProductId == null) return null;
      return {
        kind: 'bxgy',
        promotionId: promo.id,
        promotionName: promo.name,
        discountAmount: 0,
        gift: {
          productId: giftProductId,
          getQty: (action.bxgyGetQty ?? 0) * applications,
          pct: Math.min(100, Math.max(0, action.bxgyGetDiscountPct ?? 100)),
        },
      };
    }
    const discount = this.applyAction(action, ctx);
    if (discount <= 0) return null;
    return { kind: 'other', promotionId: promo.id, promotionName: promo.name, discountAmount: discount };
  }

  async applyAutoPromotions(ctx: EvaluationContext): Promise<DiscountResult[]> {
    const promotions = await this.promotionsService.findActivePromotions();
    const autoPromotions = promotions.filter((p) => !p.isCoupon);
    return this.evaluateAndStack(autoPromotions, ctx);
  }

  /**
   * Builds the cart-side rendering of every promotion currently relevant for
   * the user: every auto-applied promotion (with status active or unmet) plus
   * the saved coupon (if any). Used by `/cart` so the storefront can render
   * "what is being applied and why" without the FE recomputing anything.
   */
  async evaluateForCart(
    ctx: EvaluationContext,
    savedCouponCode: string | null,
  ): Promise<AppliedPromotionDto[]> {
    const active = await this.promotionsService.findActivePromotions();
    const results: AppliedPromotionDto[] = [];
    let hasExclusive = false;

    for (const promo of active.filter((p) => !p.isCoupon)) {
      if (hasExclusive) break;
      const scopeOk = this.checkScope(promo.scopes, ctx);
      if (!scopeOk) continue;
      const status: PromotionStatusKind = this.checkConditions(promo.conditions, ctx)
        ? 'active'
        : 'unmet';
      const discount = status === 'active' ? this.calculateDiscount(promo, ctx) : 0;
      const isFreeShipping = (promo.actions ?? [])[0]?.actionType === ActionType.FREE_SHIPPING;
      // Free-shipping promotions must remain visible even when discount = 0
      // (cart context has no shippingFee). Otherwise apply the same filter.
      if (status === 'active' && discount <= 0 && !isFreeShipping) continue;
      results.push(this.toAppliedDto(promo, 'auto', status, discount, ctx));
      if (status === 'active' && promo.stackingPolicy === 'exclusive') {
        hasExclusive = true;
      }
    }

    if (savedCouponCode) {
      const promo = await this.promotionsService.findByCouponCode(savedCouponCode);
      if (!promo) {
        results.push({
          promotionId: 0,
          name: savedCouponCode,
          source: 'coupon',
          scopeType: 'global',
          scopeLabel: 'Toàn đơn',
          actionType: 'other',
          mechanic: 'Mã không hợp lệ hoặc đã hết hạn',
          discountAmount: 0,
          conditions: [],
          status: 'exhausted',
          unmetReason: 'Mã giảm giá không tồn tại hoặc đã hết hạn',
          couponCode: savedCouponCode,
        });
      } else {
        const exhausted =
          promo.totalUsageLimit !== null && promo.usageCount >= promo.totalUsageLimit;
        if (exhausted) {
          results.push({
            ...this.toAppliedDto(promo, 'coupon', 'exhausted', 0, ctx),
            unmetReason: 'Mã đã hết lượt sử dụng',
            couponCode: promo.code ?? savedCouponCode,
          });
        } else {
          const scopeOk = this.checkScope(promo.scopes, ctx);
          const condOk = scopeOk && this.checkConditions(promo.conditions, ctx);
          const status: PromotionStatusKind = condOk ? 'active' : 'unmet';
          const discount = status === 'active' ? this.calculateDiscount(promo, ctx) : 0;
          results.push({
            ...this.toAppliedDto(promo, 'coupon', status, discount, ctx),
            couponCode: promo.code ?? savedCouponCode,
          });
        }
      }
    }

    return results;
  }

  private toAppliedDto(
    promo: Promotion,
    source: 'auto' | 'coupon',
    status: PromotionStatusKind,
    discountAmount: number,
    ctx: EvaluationContext,
  ): AppliedPromotionDto {
    const scope = (promo.scopes ?? [])[0];
    const scopeType: PromotionScopeKind = (scope?.scopeType as PromotionScopeKind) ?? 'global';
    const scopeLabel = this.describeScope(scopeType, scope, promo.scopes ?? []);
    const action = (promo.actions ?? [])[0];
    const actionType: PromotionActionKind = this.mapActionType(action?.actionType);
    const mechanic = this.describeMechanic(action);
    const conditions = (promo.conditions ?? []).map((c) => this.describeCondition(c));
    const unmetReason = status === 'unmet'
      ? this.firstUnmetReason(promo, ctx)
      : undefined;
    return {
      promotionId: promo.id,
      name: promo.name,
      source,
      scopeType,
      scopeLabel,
      actionType,
      mechanic,
      discountAmount,
      conditions,
      status,
      unmetReason,
      appliedToVariantIds: this.computeAppliedVariants(scopeType, scope, ctx),
      appliesToShipping: action?.actionType === ActionType.FREE_SHIPPING,
      bundleComponents: action?.actionType === ActionType.BUNDLE_DISCOUNT
        ? this.describeBundleProgress(action.bulkComponents ?? [], ctx)
        : undefined,
      bxgy: action?.actionType === ActionType.BXGY
        ? this.describeBxgy(action, ctx)
        : undefined,
    };
  }

  private describeBundleProgress(components: BulkComponent[], ctx: EvaluationContext): BundleComponentInfo[] {
    return components.map((c) => {
      const achieved = this.countBundleComponent(c, ctx);
      return {
        label: c.refLabel ?? `${c.scope}#${c.refId}`,
        requiredQty: c.minQuantity,
        achievedQty: achieved,
        satisfied: achieved >= c.minQuantity,
      };
    });
  }

  private describeBxgy(action: PromotionAction, ctx: EvaluationContext): BxgyInfo {
    const buyQty = action.bxgyBuyQty ?? 0;
    const getQty = action.bxgyGetQty ?? 0;
    const applications = this.countBxgyApplications(action, ctx);
    const gift = this.findBxgyGiftCandidate(action, ctx);
    return {
      buyQty,
      getQty,
      applications,
      giftVariantId: gift?.variantId ?? null,
      giftLabel: gift?.label ?? null,
      unitPrice: gift?.price ?? 0,
      discountPct: action.bxgyGetDiscountPct ?? 100,
    };
  }

  private describeScope(
    kind: PromotionScopeKind,
    scope: PromotionScope | undefined,
    allScopes: PromotionScope[],
  ): string {
    if (allScopes.length > 1) {
      return `Áp dụng theo ${allScopes.length} phạm vi`;
    }
    if (!scope) return 'Toàn đơn';
    const label = scope.scopeRefLabel ?? scope.scopeRefId?.toString() ?? '';
    switch (kind) {
      case 'global': return 'Toàn đơn';
      case 'category': return `Danh mục: ${label}`;
      case 'brand': return `Thương hiệu: ${label}`;
      case 'variant': return `Sản phẩm: ${label}`;
      default: return 'Toàn đơn';
    }
  }

  private mapActionType(t: ActionType | undefined): PromotionActionKind {
    switch (t) {
      case ActionType.PERCENTAGE_DISCOUNT: return 'percentage';
      case ActionType.FIXED_DISCOUNT_CART: return 'fixed_cart';
      case ActionType.FREE_SHIPPING:       return 'free_shipping';
      case ActionType.BULK_DISCOUNT:       return 'bulk';
      case ActionType.BUNDLE_DISCOUNT:     return 'bundle';
      case ActionType.BXGY:                return 'bxgy';
      default:                              return 'other';
    }
  }

  private describeMechanic(action: PromotionAction | undefined): string {
    if (!action) return 'Khuyến mãi';
    switch (action.actionType) {
      case ActionType.PERCENTAGE_DISCOUNT: {
        const pct = Number(action.discountValue ?? 0);
        const cap = action.maxDiscountAmount
          ? ` (tối đa ${Number(action.maxDiscountAmount).toLocaleString('vi-VN')}₫)`
          : '';
        return `Giảm ${pct}%${cap}`;
      }
      case ActionType.FIXED_DISCOUNT_CART:
        return `Giảm cố định ${Number(action.discountValue ?? 0).toLocaleString('vi-VN')}₫`;
      case ActionType.FREE_SHIPPING:
        return 'Miễn phí vận chuyển';
      case ActionType.BULK_DISCOUNT:
        return 'Giảm theo số lượng (bậc thang)';
      case ActionType.BUNDLE_DISCOUNT: {
        const t = action.discountType;
        const v = Number(action.discountValue ?? 0);
        if (t === 'percentage') return `Combo: giảm ${v}% trên giá combo`;
        if (t === 'fixed') return `Combo: giảm ${v.toLocaleString('vi-VN')}₫ mỗi combo`;
        return 'Khuyến mãi combo';
      }
      case ActionType.BXGY: {
        const buy = action.bxgyBuyQty ?? 0;
        const get = action.bxgyGetQty ?? 0;
        const pct = action.bxgyGetDiscountPct ?? 100;
        if (pct >= 100) return `Mua ${buy} tặng ${get}`;
        return `Mua ${buy}, tặng ${get} với giảm ${pct}%`;
      }
      default:
        return 'Khuyến mãi';
    }
  }

  private describeCondition(cond: PromotionCondition): string {
    const parsed = this.parseValue(cond.value);
    switch (cond.type) {
      case ConditionType.MIN_ORDER_VALUE:
        return `Đơn tối thiểu ${Number(parsed).toLocaleString('vi-VN')}₫`;
      case ConditionType.MIN_ITEM_QUANTITY:
        return `Số lượng tối thiểu ${parsed} sản phẩm`;
      case ConditionType.FIRST_ORDER_ONLY:
        return 'Chỉ áp dụng cho đơn đầu tiên';
      case ConditionType.PAYMENT_METHOD:
        return `Phương thức thanh toán: ${Array.isArray(parsed) ? parsed.join(', ') : parsed}`;
      case ConditionType.PLATFORM:
        return `Nền tảng: ${parsed}`;
      case ConditionType.REQUIRED_CATEGORIES:
        return `Cần có sản phẩm từ danh mục yêu cầu`;
      case ConditionType.REQUIRED_PRODUCTS:
        return `Cần có sản phẩm cụ thể trong giỏ`;
      default:
        return 'Điều kiện áp dụng';
    }
  }

  private firstUnmetReason(promo: Promotion, ctx: EvaluationContext): string | undefined {
    for (const cond of promo.conditions ?? []) {
      if (!this.evaluateCondition(cond, ctx)) {
        if (cond.type === ConditionType.MIN_ORDER_VALUE) {
          const need = Number(this.parseValue(cond.value));
          const missing = Math.max(0, need - ctx.subtotal);
          return `Thiếu ${missing.toLocaleString('vi-VN')}₫ để đủ điều kiện`;
        }
        return this.describeCondition(cond);
      }
    }
    if (!this.checkScope(promo.scopes, ctx)) {
      return 'Giỏ hàng không có sản phẩm thuộc phạm vi áp dụng';
    }
    return undefined;
  }

  private computeAppliedVariants(
    kind: PromotionScopeKind,
    scope: PromotionScope | undefined,
    ctx: EvaluationContext,
  ): string[] | undefined {
    if (!scope || kind === 'global') return undefined;
    if (kind === 'variant') {
      return ctx.items
        .filter((i) => i.variantId === Number(scope.scopeRefId))
        .map((i) => String(i.variantId));
    }
    // For category/brand we don't have per-item category in ctx; return undefined.
    return undefined;
  }

  async applyCoupon(code: string, ctx: EvaluationContext): Promise<DiscountResult> {
    const promotion = await this.promotionsService.findByCouponCode(code);
    if (!promotion) throw new BadRequestException('Mã giảm giá không hợp lệ hoặc đã hết hạn');

    if (promotion.totalUsageLimit !== null && promotion.usageCount >= promotion.totalUsageLimit) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng');
    }

    if (promotion.perCustomerLimit !== null) {
      const usageCount = await this.promotionsService.countCustomerUsage(promotion.id, ctx.customerId);
      if (usageCount >= promotion.perCustomerLimit) {
        throw new BadRequestException('Bạn đã sử dụng hết lượt cho mã này');
      }
    }

    const passes = this.checkConditions(promotion.conditions, ctx);
    if (!passes) throw new BadRequestException('Đơn hàng không thỏa điều kiện áp dụng mã');

    const discount = this.calculateDiscount(promotion, ctx);
    return { promotionId: promotion.id, promotionName: promotion.name, discountAmount: discount, isCoupon: true };
  }

  private evaluateAndStack(promotions: Promotion[], ctx: EvaluationContext): DiscountResult[] {
    const results: DiscountResult[] = [];
    let hasExclusive = false;

    for (const promotion of promotions) {
      if (hasExclusive) break;
      if (!this.checkScope(promotion.scopes, ctx)) continue;
      if (!this.checkConditions(promotion.conditions, ctx)) continue;

      const discount = this.calculateDiscount(promotion, ctx);
      if (discount <= 0) continue;

      results.push({ promotionId: promotion.id, promotionName: promotion.name, discountAmount: discount, isCoupon: false });

      if (promotion.stackingPolicy === 'exclusive') {
        hasExclusive = true;
      }
    }

    return results;
  }

  private checkScope(scopes: PromotionScope[], ctx: EvaluationContext): boolean {
    if (!scopes || scopes.length === 0) return true;
    return scopes.some((scope) => {
      if (scope.scopeType === ScopeType.GLOBAL) return true;
      if (scope.scopeType === ScopeType.CATEGORY) {
        return ctx.categoryIds?.includes(Number(scope.scopeRefId)) ?? false;
      }
      if (scope.scopeType === ScopeType.BRAND) {
        return ctx.brandIds?.includes(Number(scope.scopeRefId)) ?? false;
      }
      if (scope.scopeType === ScopeType.VARIANT) {
        return ctx.items.some((i) => i.variantId === Number(scope.scopeRefId));
      }
      return false;
    });
  }

  private checkConditions(conditions: PromotionCondition[], ctx: EvaluationContext): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((cond) => this.evaluateCondition(cond, ctx));
  }

  private evaluateCondition(cond: PromotionCondition, ctx: EvaluationContext): boolean {
    const parsed = this.parseValue(cond.value);

    switch (cond.type) {
      case ConditionType.MIN_ORDER_VALUE:
        return this.compare(ctx.subtotal, parsed as number, cond.operator);
      case ConditionType.FIRST_ORDER_ONLY:
        return ctx.isFirstOrder;
      case ConditionType.PAYMENT_METHOD:
        return Array.isArray(parsed)
          ? parsed.includes(ctx.paymentMethod)
          : ctx.paymentMethod === parsed;
      case ConditionType.PLATFORM:
        return ctx.platform === parsed;
      case ConditionType.MIN_ITEM_QUANTITY: {
        const totalQty = ctx.items.reduce((sum, i) => sum + i.quantity, 0);
        return this.compare(totalQty, parsed as number, cond.operator);
      }
      case ConditionType.REQUIRED_CATEGORIES: {
        const categoryIds = (parsed as (number | string)[]).map(Number);
        const cartCategoryIds = ctx.categoryIds ?? [];
        if (cond.operator === ConditionOperator.ANY_IN_CART) {
          return categoryIds.some((id) => cartCategoryIds.includes(id));
        }
        if (cond.operator === ConditionOperator.ALL_IN_CART) {
          return categoryIds.every((id) => cartCategoryIds.includes(id));
        }
        return true;
      }
      case ConditionType.REQUIRED_PRODUCTS: {
        const variantIds = (parsed as (number | string)[]).map(Number);
        const cartVariantIds = ctx.items.map((i) => i.variantId);
        if (cond.operator === ConditionOperator.ANY_IN_CART) {
          return variantIds.some((id) => cartVariantIds.includes(id));
        }
        if (cond.operator === ConditionOperator.ALL_IN_CART) {
          return variantIds.every((id) => cartVariantIds.includes(id));
        }
        return true;
      }
      default:
        return true;
    }
  }

  private compare(actual: number, expected: number, operator: ConditionOperator): boolean {
    switch (operator) {
      case ConditionOperator.GTE: return actual >= expected;
      case ConditionOperator.LTE: return actual <= expected;
      case ConditionOperator.EQ: return actual === expected;
      default: return true;
    }
  }

  private parseValue(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private calculateDiscount(promotion: Promotion, ctx: EvaluationContext): number {
    if (!promotion.actions || promotion.actions.length === 0) return 0;
    const action = promotion.actions[0];
    return this.applyAction(action, ctx);
  }

  private applyAction(action: PromotionAction, ctx: EvaluationContext): number {
    switch (action.actionType) {
      case ActionType.PERCENTAGE_DISCOUNT: {
        const raw = (ctx.subtotal * (action.discountValue ?? 0)) / 100;
        const capped = action.maxDiscountAmount ? Math.min(raw, action.maxDiscountAmount) : raw;
        return Math.round(capped);
      }
      case ActionType.FIXED_DISCOUNT_CART:
        return Math.min(action.discountValue ?? 0, ctx.subtotal);
      case ActionType.FREE_SHIPPING:
        // Represents the amount the customer saves on shipping. Cart contexts
        // pass shippingFee = 0 (unknown) so the promotion stays visible but
        // contributes 0 to subtotal discount. Checkout passes the real fee.
        return Math.max(0, Math.round(ctx.shippingFee ?? 0));
      case ActionType.BULK_DISCOUNT:
        return this.applyBulkDiscount(action.bulkTiers ?? [], ctx);
      case ActionType.BUNDLE_DISCOUNT:
        return this.applyBundleDiscount(action, ctx);
      case ActionType.BXGY:
        return this.applyBxgy(action, ctx);
      default:
        return action.discountValue ?? 0;
    }
  }

  // ── Bundle helpers ─────────────────────────────────────────────────────────

  private countBundleComponent(c: BulkComponent, ctx: EvaluationContext): number {
    const refId = Number(c.refId);
    if (!Number.isFinite(refId)) return 0;
    let qty = 0;
    for (const item of ctx.items) {
      if (c.scope === 'variant') {
        if (item.variantId === refId) qty += item.quantity;
      } else if (c.scope === 'product') {
        const info = ctx.productByVariant?.get(item.variantId);
        if (info?.productId === refId) qty += item.quantity;
      } else if (c.scope === 'category') {
        const info = ctx.productByVariant?.get(item.variantId);
        if (info?.categoryId === refId) qty += item.quantity;
      }
    }
    return qty;
  }

  private applyBundleDiscount(action: PromotionAction, ctx: EvaluationContext): number {
    const components = action.bulkComponents ?? [];
    if (!components.length) return 0;
    let bundleCount = Infinity;
    for (const c of components) {
      const got = this.countBundleComponent(c, ctx);
      const possible = Math.floor(got / Math.max(1, c.minQuantity));
      if (possible < bundleCount) bundleCount = possible;
      if (bundleCount === 0) return 0;
    }
    if (!Number.isFinite(bundleCount) || bundleCount <= 0) return 0;

    // Compute the combo-base price (sum of one set's listed prices).
    const comboBase = components.reduce((sum, c) => {
      const refId = Number(c.refId);
      let unitPrice = 0;
      // Pick the cheapest matching item's price as the component unit price.
      for (const item of ctx.items) {
        const info = ctx.productByVariant?.get(item.variantId);
        const matches =
          (c.scope === 'variant' && item.variantId === refId) ||
          (c.scope === 'product' && info?.productId === refId) ||
          (c.scope === 'category' && info?.categoryId === refId);
        if (matches) {
          if (unitPrice === 0 || item.price < unitPrice) unitPrice = item.price;
        }
      }
      return sum + unitPrice * c.minQuantity;
    }, 0);

    const value = Number(action.discountValue ?? 0);
    let perBundleDiscount = 0;
    if (action.discountType === 'percentage') {
      perBundleDiscount = (comboBase * value) / 100;
    } else if (action.discountType === 'fixed') {
      perBundleDiscount = value;
    }
    const total = Math.round(perBundleDiscount * bundleCount);
    return Math.min(total, ctx.subtotal);
  }

  // ── BXGY helpers ───────────────────────────────────────────────────────────

  private getBxgyEligibleProductIds(action: PromotionAction): number[] {
    if (!action.bxgyEligibleProductIds) return [];
    return action.bxgyEligibleProductIds
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
  }

  private countBxgyBuyQuantity(action: PromotionAction, ctx: EvaluationContext): number {
    const eligible = this.getBxgyEligibleProductIds(action);
    const buyProductId = action.bxgyBuyProductId ? Number(action.bxgyBuyProductId) : null;
    let qty = 0;
    for (const item of ctx.items) {
      const info = ctx.productByVariant?.get(item.variantId);
      if (buyProductId != null) {
        if (info?.productId === buyProductId) qty += item.quantity;
      } else if (eligible.length > 0) {
        if (info && eligible.includes(info.productId)) qty += item.quantity;
      } else {
        // No filter — every item counts as a "buy".
        qty += item.quantity;
      }
    }
    return qty;
  }

  private countBxgyApplications(action: PromotionAction, ctx: EvaluationContext): number {
    const buyQty = Math.max(1, action.bxgyBuyQty ?? 1);
    const buyCount = this.countBxgyBuyQuantity(action, ctx);
    const raw = Math.floor(buyCount / buyQty);
    const cap = action.bxgyMaxApplications ?? Infinity;
    return Math.max(0, Math.min(raw, cap));
  }

  private findBxgyGiftCandidate(
    action: PromotionAction,
    ctx: EvaluationContext,
  ): { variantId: number; label: string; price: number; productId: number } | null {
    const giftProductId = action.bxgyGetProductId ? Number(action.bxgyGetProductId) : null;
    // Look up the gift variant from items already in cart (auto-add mode also
    // needs the variant to attach to). If not in cart, evaluator returns null —
    // checkout will fetch it from DB before adding to the order.
    for (const item of ctx.items) {
      const info = ctx.productByVariant?.get(item.variantId);
      if (giftProductId != null && info?.productId === giftProductId) {
        return { variantId: item.variantId, label: '', price: item.price, productId: giftProductId };
      }
    }
    return giftProductId != null
      ? { variantId: 0, label: '', price: 0, productId: giftProductId }
      : null;
  }

  private applyBxgy(action: PromotionAction, ctx: EvaluationContext): number {
    const applications = this.countBxgyApplications(action, ctx);
    if (applications <= 0) return 0;
    const getQty = action.bxgyGetQty ?? 0;
    if (getQty <= 0) return 0;
    const pct = Math.min(100, Math.max(0, action.bxgyGetDiscountPct ?? 100));
    const gift = this.findBxgyGiftCandidate(action, ctx);
    if (!gift) return 0;
    // When gift variant exists in cart we know its price; otherwise the
    // discount is materialised in checkout when the gift line item is added.
    // For preview purposes return 0 in that case to avoid double-counting.
    if (gift.price <= 0) return 0;
    const giftValue = gift.price * getQty * applications;
    return Math.round((giftValue * pct) / 100);
  }

  private applyBulkDiscount(tiers: BulkTier[], ctx: EvaluationContext): number {
    const totalQty = ctx.items.reduce((sum, i) => sum + i.quantity, 0);
    const tier = tiers
      .filter((t) => totalQty >= t.minQuantity && (t.maxQuantity === null || totalQty <= t.maxQuantity))
      .sort((a, b) => b.minQuantity - a.minQuantity)[0];

    if (!tier) return 0;
    if (tier.discountType === 'percentage') {
      return Math.round((ctx.subtotal * tier.discountValue) / 100);
    }
    return Math.min(tier.discountValue, ctx.subtotal);
  }
}
