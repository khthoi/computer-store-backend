import {
  Injectable, NotFoundException, ForbiddenException,
  ConflictException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v2 as cloudinary } from 'cloudinary';
import { ProductReview } from './entities/product-review.entity';
import { ReviewMessage } from './entities/review-message.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { BulkModerateDto } from './dto/bulk-moderate.dto';
import { ReviewResponseDto, ReviewMessageResponseDto } from './dto/review-response.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewRepo: Repository<ProductReview>,
    @InjectRepository(ReviewMessage)
    private readonly messageRepo: Repository<ReviewMessage>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ─── Public ───────────────────────────────────────────────────────────────

  async getApprovedReviews(
    productId: number,
    page = 1,
    limit = 10,
    filters: { rating?: number; hasImages?: boolean; variantId?: number } = {},
  ) {
    const offset = (page - 1) * limit;

    // Build optional filters — distribution is always unfiltered so the sidebar
    // bars stay stable regardless of the active filter chip.
    const filterClauses: string[] = [];
    const filterParams: (string | number | boolean)[] = [];
    if (filters.rating && filters.rating >= 1 && filters.rating <= 5) {
      filterClauses.push('r.rating = ?');
      filterParams.push(filters.rating);
    }
    if (filters.hasImages) {
      // `hinh_anh` is a TypeORM `simple-json` column (stored as TEXT, not native
      // JSON). Use a substring check rather than JSON_LENGTH so the filter works
      // regardless of MySQL column type or whitespace variations.
      filterClauses.push("r.hinh_anh IS NOT NULL AND r.hinh_anh <> '' AND r.hinh_anh <> '[]'");
    }
    // Variant filter — applied to items/total/distribution/avg so the SKU
    // rating reflects only the selected variant.
    if (filters.variantId && filters.variantId > 0) {
      filterClauses.push('r.phien_ban_id = ?');
      filterParams.push(filters.variantId);
    }
    const extraWhere = filterClauses.length > 0 ? ` AND ${filterClauses.join(' AND ')}` : '';

    const [rows, [{ total }], distRows, [avgRow]] = await Promise.all([
      this.dataSource.query(
        `SELECT
          r.review_id, r.phien_ban_id, r.khach_hang_id, r.don_hang_id,
          r.rating, r.tieu_de, r.noi_dung, r.hinh_anh, r.review_status,
          r.da_phan_hoi, r.helpful_count, r.duyet_tai, r.nguon_danh_gia,
          r.created_at, r.updated_at,
          v.ten_phien_ban, v.sku AS sku_phien_ban,
          kh.ho_ten AS khach_hang_ten, kh.anh_dai_dien AS khach_hang_avatar
         FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         INNER JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
         WHERE v.san_pham_id = ? AND r.review_status = 'Approved'${extraWhere}
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [productId, ...filterParams, limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS total FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         WHERE v.san_pham_id = ? AND r.review_status = 'Approved'${extraWhere}`,
        [productId, ...filterParams],
      ),
      this.dataSource.query(
        `SELECT r.rating AS rating, COUNT(*) AS cnt
         FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         WHERE v.san_pham_id = ? AND r.review_status = 'Approved'
         GROUP BY r.rating`,
        [productId],
      ),
      this.dataSource.query(
        `SELECT AVG(r.rating) AS avg_rating, COUNT(*) AS cnt
         FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         WHERE v.san_pham_id = ? AND r.review_status = 'Approved'${extraWhere}`,
        [productId, ...filterParams],
      ),
    ]);

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of distRows as { rating: number; cnt: number | string }[]) {
      const star = Number(row.rating) as 1 | 2 | 3 | 4 | 5;
      if (star >= 1 && star <= 5) distribution[star] = Number(row.cnt);
    }

    const averageRating = avgRow?.avg_rating != null ? Number(avgRow.avg_rating) : 0;

    return {
      items: (rows as any[]).map((r) => this.rawToDto(r)),
      total: Number(total),
      page,
      limit,
      distribution,
      averageRating,
    };
  }

  // ─── Customer ─────────────────────────────────────────────────────────────

  async submitReview(
    dto: CreateReviewDto,
    customerId: number,
    files: Express.Multer.File[] = [],
  ): Promise<ReviewResponseDto> {
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

    const existing = await this.reviewRepo.findOne({
      where: { customerId, variantId: dto.variantId, orderId: dto.orderId },
    });
    if (existing) {
      throw new ConflictException('Bạn đã đánh giá sản phẩm này cho đơn hàng này rồi');
    }

    // Upload images to Cloudinary (sequential to keep memory predictable; max 5
    // files per request anyway enforced by FilesInterceptor).
    const images: Array<{ url: string; publicId: string }> = [];
    for (const file of files) {
      if (!file?.buffer || file.size === 0) continue;
      if (!file.mimetype?.startsWith('image/')) {
        throw new BadRequestException(`Tệp "${file.originalname}" không phải là ảnh hợp lệ`);
      }
      const uploaded = await this.uploadReviewImage(file);
      images.push(uploaded);
    }

    const review = this.reviewRepo.create({
      variantId: dto.variantId,
      customerId,
      orderId: dto.orderId,
      rating: dto.rating,
      title: dto.title ?? null,
      content: dto.content ?? null,
      images: images.length > 0 ? images : null,
      status: 'Pending',
    });
    return this.toDto(await this.reviewRepo.save(review));
  }

  private uploadReviewImage(file: Express.Multer.File): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'pc-store/reviews', resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(new Error(error?.message ?? 'Upload ảnh đánh giá thất bại'));
          }
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(file.buffer);
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(query: QueryReviewsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];

    if (query.status) {
      conditions.push('r.review_status = ?');
      params.push(query.status);
    }
    if (query.variantId) {
      conditions.push('r.phien_ban_id = ?');
      params.push(query.variantId);
    }
    if (query.rating) {
      conditions.push('r.rating = ?');
      params.push(query.rating);
    }
    if (query.search) {
      conditions.push(`(sp.ten_san_pham LIKE ? OR r.tieu_de LIKE ? OR r.noi_dung LIKE ? OR kh.ho_ten LIKE ? OR dh.ma_don_hang LIKE ?)`);
      const q = `%${query.search}%`;
      params.push(q, q, q, q, q);
    }
    if (query.dateFrom) {
      conditions.push('r.created_at >= ?');
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      conditions.push('r.created_at <= ?');
      params.push(query.dateTo + ' 23:59:59');
    }
    if (query.chuaTraLoi) {
      conditions.push("r.review_status = 'Approved' AND r.da_phan_hoi = 0");
    }
    if (query.nguon) {
      conditions.push('r.nguon_danh_gia = ?');
      params.push(query.nguon);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const statsConditions: string[] = [];
    const statsParams: (string | number)[] = [];
    if (query.variantId) {
      statsConditions.push('r.phien_ban_id = ?');
      statsParams.push(query.variantId);
    }
    const statsWhere = statsConditions.length > 0 ? `WHERE ${statsConditions.join(' AND ')}` : '';

    const [rows, [{ total }], statsRows] = await Promise.all([
      this.dataSource.query(
        `SELECT
          r.review_id, r.phien_ban_id, r.khach_hang_id, r.don_hang_id,
          r.rating, r.tieu_de, r.noi_dung, r.review_status,
          r.nguoi_duyet_id, r.ly_do_tu_choi, r.da_phan_hoi, r.helpful_count,
          r.duyet_tai, r.created_at, r.updated_at, r.nguon_danh_gia,
          sp.san_pham_id, sp.ten_san_pham, v.ten_phien_ban, v.sku AS sku_phien_ban,
          (SELECT url_hinh_anh FROM hinh_anh_san_pham
           WHERE phien_ban_id = v.phien_ban_id AND loai_anh = 'AnhChinh'
           ORDER BY thu_tu ASC LIMIT 1) AS anh_phien_ban,
          kh.ho_ten AS khach_hang_ten, kh.so_dien_thoai AS khach_hang_sdt, kh.anh_dai_dien AS khach_hang_avatar,
          dh.ma_don_hang, nv.ho_ten AS nguoi_duyet_ten, nv.ma_nhan_vien AS nguoi_duyet_ma
         FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
         INNER JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
         INNER JOIN don_hang dh ON dh.don_hang_id = r.don_hang_id
         LEFT JOIN nhan_vien nv ON nv.nhan_vien_id = r.nguoi_duyet_id
         ${where}
         ORDER BY r.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS total
         FROM danh_gia_san_pham r
         INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
         INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
         INNER JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
         INNER JOIN don_hang dh ON dh.don_hang_id = r.don_hang_id
         ${where}`,
        params,
      ),
      this.dataSource.query(
        `SELECT
          COUNT(*) AS tongDanhGia,
          SUM(CASE WHEN r.review_status = 'Approved' THEN 1 ELSE 0 END) AS daDuyet,
          SUM(CASE WHEN r.review_status = 'Pending'  THEN 1 ELSE 0 END) AS choDuyet,
          SUM(CASE WHEN r.review_status = 'Rejected' THEN 1 ELSE 0 END) AS tuChoi,
          SUM(CASE WHEN r.review_status = 'Hidden'   THEN 1 ELSE 0 END) AS daAn,
          ROUND(AVG(r.rating), 1) AS tbRating,
          SUM(CASE WHEN r.review_status = 'Approved' AND r.da_phan_hoi = 0 THEN 1 ELSE 0 END) AS chuaTraLoi,
          SUM(CASE WHEN r.rating = 5 THEN 1 ELSE 0 END) AS r5,
          SUM(CASE WHEN r.rating = 4 THEN 1 ELSE 0 END) AS r4,
          SUM(CASE WHEN r.rating = 3 THEN 1 ELSE 0 END) AS r3,
          SUM(CASE WHEN r.rating = 2 THEN 1 ELSE 0 END) AS r2,
          SUM(CASE WHEN r.rating = 1 THEN 1 ELSE 0 END) AS r1
         FROM danh_gia_san_pham r ${statsWhere}`,
        statsParams,
      ),
    ]);

    const s = statsRows[0] ?? {};
    const stats = {
      tong:       Number(s.tongDanhGia ?? 0),
      choDuyet:   Number(s.choDuyet    ?? 0),
      daDuyet:    Number(s.daDuyet     ?? 0),
      tuChoi:     Number(s.tuChoi      ?? 0),
      an:         Number(s.daAn        ?? 0),
      tbRating:   Number(s.tbRating    ?? 0),
      chuaTraLoi: Number(s.chuaTraLoi  ?? 0),
    };

    const totalPages = Math.ceil(Number(total) / limit);
    return {
      data: (rows as any[]).map((r) => this.toRichDto(r)),
      total: Number(total),
      page,
      limit,
      totalPages,
      stats,
    };
  }

  async getStats() {
    const [s] = await this.dataSource.query(
      `SELECT
        COUNT(*) AS tong,
        SUM(CASE WHEN review_status = 'Approved' THEN 1 ELSE 0 END) AS daDuyet,
        SUM(CASE WHEN review_status = 'Pending'  THEN 1 ELSE 0 END) AS choDuyet,
        SUM(CASE WHEN review_status = 'Rejected' THEN 1 ELSE 0 END) AS tuChoi,
        SUM(CASE WHEN review_status = 'Hidden'   THEN 1 ELSE 0 END) AS an,
        ROUND(AVG(CASE WHEN review_status = 'Approved' THEN rating END), 1) AS tbRating,
        SUM(CASE WHEN review_status = 'Approved' AND da_phan_hoi = 0 THEN 1 ELSE 0 END) AS chuaTraLoi
       FROM danh_gia_san_pham`,
    );
    return {
      tong:       Number(s.tong       ?? 0),
      choDuyet:   Number(s.choDuyet   ?? 0),
      daDuyet:    Number(s.daDuyet    ?? 0),
      tuChoi:     Number(s.tuChoi     ?? 0),
      an:         Number(s.an         ?? 0),
      tbRating:   Number(s.tbRating   ?? 0),
      chuaTraLoi: Number(s.chuaTraLoi ?? 0),
    };
  }

  async getDetail(id: number): Promise<ReviewResponseDto & { messages: ReviewMessageResponseDto[] }> {
    const rows = await this.dataSource.query(
      `SELECT
        r.review_id, r.phien_ban_id, r.khach_hang_id, r.don_hang_id,
        r.rating, r.tieu_de, r.noi_dung, r.review_status,
        r.nguoi_duyet_id, r.ly_do_tu_choi, r.da_phan_hoi, r.helpful_count,
        r.duyet_tai, r.created_at, r.updated_at, r.nguon_danh_gia,
        sp.san_pham_id, sp.ten_san_pham, v.ten_phien_ban, v.sku AS sku_phien_ban,
        (SELECT url_hinh_anh FROM hinh_anh_san_pham
         WHERE phien_ban_id = v.phien_ban_id AND loai_anh = 'AnhChinh'
         ORDER BY thu_tu ASC LIMIT 1) AS anh_phien_ban,
        kh.ho_ten AS khach_hang_ten, kh.anh_dai_dien AS khach_hang_avatar,
        dh.ma_don_hang, nv.ho_ten AS nguoi_duyet_ten, nv.ma_nhan_vien AS nguoi_duyet_ma
       FROM danh_gia_san_pham r
       INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
       INNER JOIN san_pham sp ON sp.san_pham_id = v.san_pham_id
       INNER JOIN khach_hang kh ON kh.khach_hang_id = r.khach_hang_id
       INNER JOIN don_hang dh ON dh.don_hang_id = r.don_hang_id
       LEFT JOIN nhan_vien nv ON nv.nhan_vien_id = r.nguoi_duyet_id
       WHERE r.review_id = ?`,
      [id],
    );
    if (!rows || rows.length === 0) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);

    const messages = await this.getMessages(id);
    return { ...this.toRichDto(rows[0]), messages };
  }

  async approveReview(id: number, employeeId: number): Promise<ReviewResponseDto> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);
    if (review.status === 'Approved') throw new BadRequestException('Đánh giá đã được duyệt');

    const oldStatus = review.status;
    review.status = 'Approved';
    review.approvedById = employeeId;
    review.approvedAt = new Date().toISOString();
    await this.reviewRepo.save(review);

    await this.recomputeProductRating(review.variantId);

    this.auditLogsService.log({
      entityType: 'DanhGia',
      entityId: String(id),
      entityLabel: `Đánh giá #${id}`,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → Approved`,
      before: JSON.stringify({ status: oldStatus }),
      after: JSON.stringify({ status: 'Approved' }),
    });

    return this.toDto(review);
  }

  async rejectReview(id: number, dto: ModerateReviewDto, employeeId: number): Promise<ReviewResponseDto> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);

    const oldStatus = review.status;
    const wasApproved = oldStatus === 'Approved';
    review.status = 'Rejected';
    review.approvedById = employeeId;
    review.rejectReason = dto.reason ?? null;
    const saved = await this.reviewRepo.save(review);

    if (wasApproved) await this.recomputeProductRating(review.variantId);

    this.auditLogsService.log({
      entityType: 'DanhGia',
      entityId: String(id),
      entityLabel: `Đánh giá #${id}`,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → Rejected`,
      before: JSON.stringify({ status: oldStatus }),
      after: JSON.stringify({ status: 'Rejected' }),
    });

    return this.toDto(saved);
  }

  async hideReview(id: number, dto: ModerateReviewDto, employeeId: number): Promise<ReviewResponseDto> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Đánh giá #${id} không tồn tại`);

    const oldStatus = review.status;
    const wasApproved = oldStatus === 'Approved';
    review.status = 'Hidden';
    review.approvedById = employeeId;
    review.rejectReason = dto.reason ?? null;
    const saved = await this.reviewRepo.save(review);

    if (wasApproved) await this.recomputeProductRating(review.variantId);

    this.auditLogsService.log({
      entityType: 'DanhGia',
      entityId: String(id),
      entityLabel: `Đánh giá #${id}`,
      actionType: 'DoiTrangThai',
      actionDetail: `Đổi trạng thái ${oldStatus} → Hidden`,
      before: JSON.stringify({ status: oldStatus }),
      after: JSON.stringify({ status: 'Hidden' }),
    });

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

    if (messageType === 'Reply') {
      await this.reviewRepo.update(id, { hasReply: 1 });
    }

    this.auditLogsService.log({
      entityType: 'DanhGia',
      entityId: String(id),
      entityLabel: `Đánh giá #${id}`,
      actionType: 'CapNhat',
      actionDetail: `Nhân viên thêm ${messageType === 'InternalNote' ? 'ghi chú nội bộ' : 'phản hồi công khai'} vào đánh giá #${id}`,
      after: JSON.stringify({
        messageId: saved.id,
        type: saved.messageType,
        content: saved.content?.substring(0, 200),
        reviewId: id,
      }),
    });

    return this.toMessageDto(saved);
  }

  async getMessages(reviewId: number): Promise<ReviewMessageResponseDto[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT m.*, nv.ho_ten AS sender_name, nv.anh_dai_dien AS sender_avatar, nv.ma_nhan_vien AS sender_code
       FROM danh_gia_message m
       LEFT JOIN nhan_vien nv ON nv.nhan_vien_id = m.sender_id
       WHERE m.review_id = ?
       ORDER BY m.created_at ASC`,
      [reviewId],
    );
    return rows.map((row) => ({
      messageId:           row.message_id,
      reviewId:            row.review_id,
      senderType:          row.sender_type,
      senderId:            row.sender_id ?? null,
      senderName:          row.sender_name ?? 'Hệ thống',
      senderAvatar:        row.sender_avatar ?? null,
      senderCode:          row.sender_code ?? null,
      noiDungTinNhan:      row.noi_dung_tin_nhan,
      messageType:         row.message_type,
      isVisibleToCustomer: !!row.is_visible_to_customer,
      createdAt:           row.created_at,
      updatedAt:           row.updated_at ?? null,
    }));
  }

  async bulkModerate(dto: BulkModerateDto, employeeId: number): Promise<void> {
    for (const id of dto.reviewIds) {
      if (dto.action === 'approve') {
        await this.approveReview(id, employeeId);
      } else {
        await this.rejectReview(id, { reason: dto.reason }, employeeId);
      }
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private async recomputeProductRating(variantId: number): Promise<void> {
    // Resolve the product id from the variant first, then aggregate across ALL
    // variants of that product. The previous version filtered by `phien_ban_id`
    // directly which only counted reviews for one variant — so a product with
    // multiple variants would have a stale `so_luot_danh_gia` cache that was
    // smaller than the real count visible to the storefront.
    const [variantRow] = await this.dataSource.query(
      `SELECT san_pham_id FROM phien_ban_san_pham WHERE phien_ban_id = ?`,
      [variantId],
    );
    if (!variantRow) return;
    const productId = Number(variantRow.san_pham_id);

    const [agg] = await this.dataSource.query(
      `SELECT COUNT(r.review_id) AS cnt, AVG(r.rating) AS avg_rating
       FROM danh_gia_san_pham r
       INNER JOIN phien_ban_san_pham v ON v.phien_ban_id = r.phien_ban_id
       WHERE v.san_pham_id = ? AND r.review_status = 'Approved'`,
      [productId],
    );

    await this.dataSource.query(
      `UPDATE san_pham
       SET diem_danh_gia_tb = ROUND(?, 2), so_luot_danh_gia = ?
       WHERE san_pham_id = ?`,
      [agg?.avg_rating ?? 0, agg?.cnt ?? 0, productId],
    );
  }

  private toRichDto(row: any): ReviewResponseDto {
    return {
      reviewId:      row.review_id,
      phienBanId:    row.phien_ban_id,
      khachHangId:   row.khach_hang_id,
      donHangId:     row.don_hang_id,
      rating:        row.rating,
      tieuDe:        row.tieu_de ?? null,
      noiDung:       row.noi_dung ?? null,
      trangThai:     row.review_status,
      daPhanHoi:     !!row.da_phan_hoi,
      helpfulCount:  row.helpful_count ?? 0,
      nguoiDuyetId:  row.nguoi_duyet_id ?? null,
      lyDoTuChoi:    row.ly_do_tu_choi ?? null,
      duyetTai:      row.duyet_tai ?? null,
      nguon:         row.nguon_danh_gia ?? 'Website',
      createdAt:     row.created_at,
      updatedAt:     row.updated_at,
      sanPhamId:     row.san_pham_id ?? null,
      tenSanPham:    row.ten_san_pham ?? null,
      tenPhienBan:   row.ten_phien_ban ?? null,
      skuPhienBan:   row.sku_phien_ban ?? null,
      anhPhienBan:   row.anh_phien_ban ?? null,
      khachHangTen:  row.khach_hang_ten ?? null,
      khachHangSdT:  row.khach_hang_sdt ?? null,
      khachHangAvatar: row.khach_hang_avatar ?? null,
      maDonHang:     row.ma_don_hang ?? null,
      nguoiDuyetTen: row.nguoi_duyet_ten ?? null,
      nguoiDuyetMa:  row.nguoi_duyet_ma ?? null,
    };
  }

  private toDto(review: ProductReview): ReviewResponseDto {
    return {
      reviewId:     review.id,
      phienBanId:   review.variantId,
      khachHangId:  review.customerId,
      donHangId:    review.orderId,
      rating:       review.rating,
      tieuDe:       review.title,
      noiDung:      review.content,
      hinhAnh:      (review.images ?? []).map((i) => i.url),
      trangThai:    review.status,
      daPhanHoi:    !!review.hasReply,
      helpfulCount: review.helpfulCount,
      nguoiDuyetId: review.approvedById,
      lyDoTuChoi:   review.rejectReason,
      duyetTai:     review.approvedAt,
      nguon:        review.nguon ?? 'Website',
      createdAt:    review.createdAt,
      updatedAt:    review.updatedAt,
    };
  }

  private rawToDto(row: any): ReviewResponseDto {
    // `hinh_anh` is stored as JSON; MySQL may return it as a string or pre-parsed
    // object depending on driver version. Normalise to a URL list.
    let imageUrls: string[] = [];
    const raw = row.hinh_anh;
    if (raw) {
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          imageUrls = parsed
            .map((entry: any) => (typeof entry === 'string' ? entry : entry?.url))
            .filter((u: unknown): u is string => typeof u === 'string' && u.length > 0);
        }
      } catch {
        imageUrls = [];
      }
    }

    return {
      reviewId:        row.review_id,
      phienBanId:      row.phien_ban_id,
      khachHangId:     row.khach_hang_id,
      donHangId:       row.don_hang_id,
      rating:          row.rating,
      tieuDe:          row.tieu_de ?? null,
      noiDung:         row.noi_dung ?? null,
      hinhAnh:         imageUrls,
      trangThai:       row.review_status,
      daPhanHoi:       !!row.da_phan_hoi,
      helpfulCount:    row.helpful_count ?? 0,
      nguoiDuyetId:    row.nguoi_duyet_id ?? null,
      lyDoTuChoi:      row.ly_do_tu_choi ?? null,
      duyetTai:        row.duyet_tai ?? null,
      nguon:           row.nguon_danh_gia ?? 'Website',
      sanPhamId:       row.san_pham_id ?? null,
      tenSanPham:      row.ten_san_pham ?? null,
      tenPhienBan:     row.ten_phien_ban ?? null,
      skuPhienBan:     row.sku_phien_ban ?? null,
      khachHangTen:    row.khach_hang_ten ?? null,
      khachHangAvatar: row.khach_hang_avatar ?? null,
      createdAt:       row.created_at,
      updatedAt:       row.updated_at,
    };
  }

  private toMessageDto(message: ReviewMessage, senderName = 'Hệ thống', senderAvatar: string | null = null): ReviewMessageResponseDto {
    return {
      messageId:           message.id,
      reviewId:            message.reviewId,
      senderType:          message.senderType,
      senderId:            message.senderId,
      senderName,
      senderAvatar,
      noiDungTinNhan:      message.content,
      messageType:         message.messageType,
      isVisibleToCustomer: !!message.isVisibleToCustomer,
      createdAt:           message.createdAt,
      updatedAt:           message.updatedAt ?? null,
    };
  }
}
