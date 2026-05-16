import { SavedBuild } from '../entities/saved-build.entity';

interface SlotSummary {
  slotId: number;
  slotTen: string;
  maKhe: string;
  soLuong: number;
}

export class MySavedBuildSummaryDto {
  id: number;
  tenBuild: string;
  moTa: string | null;
  trangThai: string;
  isPublic: boolean;
  tongGia: number;
  itemCount: number;
  slots: SlotSummary[];
  ngayTao: string;
  ngayCapNhat: string;

  static fromEntity(e: SavedBuild): MySavedBuildSummaryDto {
    const dto = new MySavedBuildSummaryDto();
    dto.id = e.id;
    dto.tenBuild = e.tenBuild;
    dto.moTa = e.moTa ?? null;
    const TRANG_THAI_MAP: Record<string, string> = { draft: 'draft', complete: 'complete', shared: 'complete', published: 'complete' };
    dto.trangThai = TRANG_THAI_MAP[e.trangThai] ?? 'draft';
    dto.isPublic = Boolean(e.isPublic);

    const details = e.details ?? [];
    const groupedBySlot = new Map<number, SlotSummary>();
    let total = 0;
    let itemCount = 0;
    for (const d of details) {
      const qty = d.soLuong ?? 1;
      itemCount += qty;
      const slotId = d.slotId;
      const tenSlot = d.slot?.tenSlot ?? '';
      const maKhe = d.slot?.maKhe ?? '';
      const existing = groupedBySlot.get(slotId);
      if (existing) {
        existing.soLuong += qty;
      } else {
        groupedBySlot.set(slotId, { slotId, slotTen: tenSlot, maKhe, soLuong: qty });
      }
      const price = Number(d.giaSnapshot ?? d.phienBan?.giaBan ?? 0);
      total += price * qty;
    }
    dto.slots = Array.from(groupedBySlot.values()).sort((a, b) => a.slotId - b.slotId);
    dto.itemCount = itemCount;
    dto.tongGia = Number(e.tongGiaUocTinh ?? total ?? 0);
    dto.ngayTao = e.ngayTao.toISOString();
    dto.ngayCapNhat = e.ngayCapNhat.toISOString();
    return dto;
  }
}

export interface AppliedFlashSale {
  flashSaleId: number;
  ten: string;
  giaFlash: number;
  ketThuc: string;
}

export interface AppliedPromotion {
  id: number;
  name: string;
  /** Coupon code if any; null for auto-apply promotions. */
  code: string | null;
  /** "Giảm 10%" / "Giảm 100.000 ₫" — null when discount cannot be summarized. */
  discountLabel: string | null;
  /** Numeric magnitude: 10 for 10%, 100000 for 100.000 ₫. Null when unknown. */
  discountValue: number | null;
  /** 'percentage' or 'fixed'. Null when unknown. */
  discountType: 'percentage' | 'fixed' | null;
}

interface MyBuildItem {
  id: number;
  slotId: number;
  slotTen: string;
  maKhe: string;
  sanPhamId: number;
  sanPhamSlug: string;
  tenSanPham: string;
  danhMucId: number | null;
  danhMucTen: string;
  brands: { id: number; ten: string }[];
  phienBanId: number;
  tenPhienBan: string;
  SKU: string;
  giaGoc: number;
  giaBan: number;
  /** Effective unit price after flash sale (= flashSale.giaFlash if active, else giaBan). */
  giaHienHanh: number;
  flashSale: AppliedFlashSale | null;
  /** Auto-apply promotions (is_coupon = false) currently matching this item's scope. */
  appliedPromotions: AppliedPromotion[];
  hinhAnh: string | null;
  soLuong: number;
}

export interface ApplicableCoupon {
  id: number;
  code: string;
  name: string;
  description: string | null;
  /** Human-readable summary of the discount, e.g. "Giảm 10%" or "Giảm 100.000 ₫". */
  discountLabel: string;
  endDate: string;
}

export interface BuildEnrichment {
  flashSaleByVariant: Map<number, AppliedFlashSale>;
  promotionsByVariant: Map<number, AppliedPromotion[]>;
  applicableCoupons: ApplicableCoupon[];
}

export class MySavedBuildDetailDto extends MySavedBuildSummaryDto {
  chiTiet: MyBuildItem[];
  applicableCoupons: ApplicableCoupon[];

  static fromEntityWithBrands(
    e: SavedBuild,
    brandsByProduct: Map<number, { id: number; ten: string }[]>,
    enrichment: BuildEnrichment = {
      flashSaleByVariant: new Map(),
      promotionsByVariant: new Map(),
      applicableCoupons: [],
    },
  ): MySavedBuildDetailDto {
    const dto = new MySavedBuildDetailDto();
    Object.assign(dto, MySavedBuildSummaryDto.fromEntity(e));

    let recomputedTotal = 0;

    const items: MyBuildItem[] = (e.details ?? [])
      .slice()
      .sort((a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0))
      .map((d) => {
        const variant = d.phienBan as (typeof d.phienBan & { product?: { id: number; tenSanPham: string; slug: string; danhMuc?: { id: number; tenDanhMuc: string } | null; danhMucId: number } }) | undefined;
        const product = variant?.product;
        const productId = product?.id ?? 0;
        const mainImage = d.phienBan?.images?.find((i) => (i as { loaiAnh?: string }).loaiAnh === 'AnhChinh');
        const giaBan = Number(d.giaSnapshot ?? d.phienBan?.giaBan ?? 0);
        const flash = enrichment.flashSaleByVariant.get(d.phienBanId) ?? null;
        const giaHienHanh = flash ? Number(flash.giaFlash) : giaBan;
        const qty = d.soLuong ?? 1;
        recomputedTotal += giaHienHanh * qty;
        return {
          id: d.id,
          slotId: d.slotId,
          slotTen: d.slot?.tenSlot ?? '',
          maKhe: d.slot?.maKhe ?? '',
          sanPhamId: productId,
          sanPhamSlug: product?.slug ?? '',
          tenSanPham: product?.tenSanPham ?? '',
          danhMucId: product?.danhMuc?.id ?? product?.danhMucId ?? null,
          danhMucTen: product?.danhMuc?.tenDanhMuc ?? '',
          brands: brandsByProduct.get(productId) ?? [],
          phienBanId: d.phienBanId,
          tenPhienBan: d.phienBan?.tenPhienBan ?? '',
          SKU: d.phienBan?.sku ?? '',
          giaGoc: Number(d.phienBan?.giaGoc ?? 0),
          giaBan,
          giaHienHanh,
          flashSale: flash,
          appliedPromotions: enrichment.promotionsByVariant.get(d.phienBanId) ?? [],
          hinhAnh: (mainImage as { urlHinhAnh?: string } | undefined)?.urlHinhAnh ?? null,
          soLuong: qty,
        };
      });
    dto.chiTiet = items;
    dto.applicableCoupons = enrichment.applicableCoupons;
    // Override the snapshotted tongGia with one that reflects current flash sales.
    dto.tongGia = recomputedTotal;
    return dto;
  }
}
