import { Injectable, BadRequestException } from '@nestjs/common';
import { Promotion } from './entities/promotion.entity';
import { PromotionCondition, ConditionType, ConditionOperator } from './entities/promotion-condition.entity';
import { PromotionAction, ActionType } from './entities/promotion-action.entity';
import { PromotionScope, ScopeType } from './entities/promotion-scope.entity';
import { BulkTier } from './entities/bulk-tier.entity';
import { CartItemDto } from './dto/apply-coupon.dto';
import { PromotionsService } from './promotions.service';
import {
  AppliedPromotionDto,
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
      if (status === 'active' && discount <= 0) continue;
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
        return 0;
      case ActionType.BULK_DISCOUNT:
        return this.applyBulkDiscount(action.bulkTiers ?? [], ctx);
      default:
        return action.discountValue ?? 0;
    }
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
