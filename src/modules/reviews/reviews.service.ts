import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductReview } from './entities/product-review.entity';
import { ReviewMessage } from './entities/review-message.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ReviewResponseDto, ReviewMessageResponseDto } from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewRepo: Repository<ProductReview>,
    @InjectRepository(ReviewMessage)
    private readonly messageRepo: Repository<ReviewMessage>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  async getApprovedReviews(productId: number, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const [rows, [{ total }]] = await Promise.all([
      this.dataSource.query(
        `SELECT r.* FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         WHERE v.san_pham_id = ? AND r.review_status = 'Approved'
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [productId, limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS total FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         WHERE v.san_pham_id = ? AND r.review_status = 'Approved'`,
        [productId],
      ),
    ]);
    return { items: rows.map((r: any) => this.rawToDto(r)), total: Number(total), page, limit };
  }

  // ─── Customer ─────────────────────────────────────────────────────────────

  async submitReview(dto: CreateReviewDto, customerId: number): Promise<ReviewResponseDto> {
    // Gate check: must have a delivered order containing this variant
    const purchase = await this.dataSource.query(
      `SELECT ct.chi_tiet_id
       FROM don_hang dh
       INNER JOIN chi_tiet_don_hang ct ON ct.don_hang_id = dh.don_hang_id
       WHERE dh.khach_hang_id = ? AND dh.don_hang_id = ?
         AND dh.trang_thai_don = 'DaGiao' AND ct.phien_ban_id = ?
       LIMIT 1`,
      [customerId, dto.orderId, dto.variantId],
    );
    if (!purchase || purchase.length === 0) {
      throw new ForbiddenException('Bạn cần mua và nhận hàng thành công để đánh giá sản phẩm này');
    }

    // Prevent duplicate review for same variant + order
    const existing = await this.reviewRepo.findOne({
      where: { customerId, variantId: dto.variantId, orderId: dto.orderId },
    });
    if (existing) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi');
    }

    const review = this.reviewRepo.create({
      variantId: dto.variantId,
      customerId,
      orderId: dto.orderId,
      rating: dto.rating,
      title: dto.title ?? null,
      content: dto.content ?? null,
      status: 'Pending',
    });
    return this.toDto(await this.reviewRepo.save(review));
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(query: QueryReviewsDto) {
    const qb = this.reviewRepo.createQueryBuilder('r');

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.variantId) {
      qb.andWhere('r.variantId = :variantId', { variantId: query.variantId });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await qb
      .orderBy('r.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items: items.map((r) => this.toDto(r)), total, page, limit };
  }

  async approveReview(id: number, employeeId: number): Promise<ReviewResponseDto> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);
    if (review.status === 'Approved') throw new BadRequestException('Đánh giá đã được duyệt');

    review.status = 'Approved';
    review.approvedById = employeeId;
    review.approvedAt = new Date().toISOString();
    await this.reviewRepo.save(review);

    // Recompute avg rating and review count from authoritative source
    await this.recomputeProductRating(review.variantId);

    return this.toDto(review);
  }

  async rejectReview(id: number, dto: ModerateReviewDto, employeeId: number): Promise<ReviewResponseDto> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);

    const wasApproved = review.status === 'Approved';
    review.status = 'Rejected';
    review.approvedById = employeeId;
    review.rejectReason = dto.reason ?? null;
    const saved = await this.reviewRepo.save(review);

    // Recompute rating if rejecting a previously approved review
    if (wasApproved) await this.recomputeProductRating(review.variantId);

    return this.toDto(saved);
  }

  async hideReview(id: number, dto: ModerateReviewDto, employeeId: number): Promise<ReviewResponseDto> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);

    const wasApproved = review.status === 'Approved';
    review.status = 'Hidden';
    review.approvedById = employeeId;
    review.rejectReason = dto.reason ?? null;
    const saved = await this.reviewRepo.save(review);

    if (wasApproved) await this.recomputeProductRating(review.variantId);

    return this.toDto(saved);
  }

  async replyToReview(id: number, dto: ReplyReviewDto, employeeId: number): Promise<ReviewMessageResponseDto> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);

    const messageType = dto.messageType ?? 'Reply';
    const message = this.messageRepo.create({
      reviewId: id,
      senderType: 'NhanVien',
      senderId: employeeId,
      content: dto.content,
      messageType,
      isVisibleToCustomer: messageType === 'InternalNote' ? 0 : 1,
    });
    const saved = await this.messageRepo.save(message);

    // Update the flag on the review row to avoid a join for badge display
    if (messageType === 'Reply') {
      await this.reviewRepo.update(id, { hasReply: 1 });
    }

    return this.toMessageDto(saved);
  }

  async getMessages(reviewId: number): Promise<ReviewMessageResponseDto[]> {
    const messages = await this.messageRepo.find({
      where: { reviewId },
      order: { createdAt: 'ASC' },
    });
    return messages.map((m) => this.toMessageDto(m));
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  // Recompute from count/avg of Approved reviews — avoids drift from increment/decrement
  private async recomputeProductRating(variantId: number): Promise<void> {
    const [agg] = await this.dataSource.query(
      `SELECT sp.san_pham_id,
              COUNT(r.review_id)  AS cnt,
              AVG(r.rating)       AS avg_rating
       FROM danh_gia_san_pham r
       INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
       INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
       WHERE r.phien_ban_id = ? AND r.review_status = 'Approved'
       GROUP BY sp.san_pham_id`,
      [variantId],
    );
    if (!agg) return;

    await this.dataSource.query(
      `UPDATE san_pham
       SET diem_danh_gia_tb = ROUND(?, 2), so_luot_danh_gia = ?
       WHERE san_pham_id = ?`,
      [agg.avg_rating ?? 0, agg.cnt ?? 0, agg.san_pham_id],
    );
  }

  private toDto(review: ProductReview): ReviewResponseDto {
    return {
      id: review.id,
      variantId: review.variantId,
      customerId: review.customerId,
      orderId: review.orderId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      status: review.status,
      hasReply: !!review.hasReply,
      helpfulCount: review.helpfulCount,
      approvedById: review.approvedById,
      rejectReason: review.rejectReason,
      approvedAt: review.approvedAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  // Maps raw SQL row (Vietnamese column names) → DTO
  private rawToDto(row: any): ReviewResponseDto {
    return {
      id: row.review_id,
      variantId: row.phien_ban_id,
      customerId: row.khach_hang_id,
      orderId: row.don_hang_id,
      rating: row.rating,
      title: row.tieu_de ?? null,
      content: row.noi_dung ?? null,
      status: row.review_status,
      hasReply: !!row.da_phan_hoi,
      helpfulCount: row.helpful_count ?? 0,
      approvedById: row.nguoi_duyet_id ?? null,
      rejectReason: row.ly_do_tu_choi ?? null,
      approvedAt: row.duyet_tai ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toMessageDto(message: ReviewMessage): ReviewMessageResponseDto {
    return {
      id: message.id,
      reviewId: message.reviewId,
      senderType: message.senderType,
      senderId: message.senderId,
      content: message.content,
      messageType: message.messageType,
      isVisibleToCustomer: !!message.isVisibleToCustomer,
      createdAt: message.createdAt,
    };
  }
}
