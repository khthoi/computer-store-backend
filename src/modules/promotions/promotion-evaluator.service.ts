import { Injectable, BadRequestException } from '@nestjs/common';
import { Promotion } from './entities/promotion.entity';
import { PromotionCondition, ConditionType, ConditionOperator } from './entities/promotion-condition.entity';
import { PromotionAction, ActionType } from './entities/promotion-action.entity';
import { PromotionScope, ScopeType } from './entities/promotion-scope.entity';
import { BulkTier } from './entities/bulk-tier.entity';
import { CartItemDto } from './dto/apply-coupon.dto';
import { PromotionsService } from './promotions.service';

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
