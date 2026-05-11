import { SavedBuild } from '../entities/saved-build.entity';
import { BuildDetail } from '../entities/build-detail.entity';
import { LoaiAnh } from '../../products/entities/product-image.entity';

export class SavedBuildResponseDto {
  id: string;
  userId: string;
  customerId: string;
  tenNguoiDung: string;
  email: string;
  tenBuild: string;
  moTa?: string;
  trangThai: string;
  tongGia: number;
  isPublic: boolean;
  soLuotXem: number;
  soLuotClone: number;
  ngayTao: string;
  ngayCapNhat: string;

  static fromEntity(e: SavedBuild): SavedBuildResponseDto {
    const dto = new SavedBuildResponseDto();
    dto.id = String(e.id);
    dto.userId = String(e.khachHangId ?? '');
    dto.customerId = String(e.khachHangId ?? '');
    dto.tenNguoiDung = e.khachHang?.hoTen ?? '';
    dto.email = e.khachHang?.email ?? '';
    dto.tenBuild = e.tenBuild;
    dto.moTa = e.moTa ?? undefined;
    const TRANG_THAI_MAP: Record<string, string> = { draft: 'draft', complete: 'complete', shared: 'complete', published: 'complete' };
    dto.trangThai = TRANG_THAI_MAP[e.trangThai] ?? 'draft';
    dto.tongGia = Number(e.tongGiaUocTinh ?? 0);
    dto.isPublic = Boolean(e.isPublic);
    dto.soLuotXem = e.soLuotXem;
    dto.soLuotClone = e.soLuotClone;
    dto.ngayTao = e.ngayTao.toISOString();
    dto.ngayCapNhat = e.ngayCapNhat.toISOString();
    return dto;
  }
}

class BuildItemResponseDto {
  id: string;
  buildId: string;
  slotId: string;
  slotTen: string;
  sanPhamId: string;
  phienBanId: string;
  tenPhienBan: string;
  tenSanPham: string;
  SKU: string;
  giaBan: number;
  hinhAnh?: string;
  soLuong: number;

  static fromDetail(d: BuildDetail): BuildItemResponseDto {
    const dto = new BuildItemResponseDto();
    dto.id = String(d.id);
    dto.buildId = String(d.buildId);
    dto.slotId = String(d.slotId);
    dto.slotTen = d.slot?.tenSlot ?? '';
    dto.sanPhamId = String(d.phienBan?.sanPhamId ?? '');
    dto.phienBanId = String(d.phienBanId);
    dto.tenPhienBan = d.phienBan?.tenPhienBan ?? '';
    dto.tenSanPham = (d.phienBan as any)?.product?.tenSanPham ?? '';
    dto.SKU = d.phienBan?.sku ?? '';
    dto.giaBan = Number(d.giaSnapshot ?? d.phienBan?.giaBan ?? 0);
    dto.hinhAnh = d.phienBan?.images?.find((i) => i.loaiAnh === LoaiAnh.AnhChinh)?.urlHinhAnh ?? undefined;
    dto.soLuong = d.soLuong;
    return dto;
  }
}

export class SavedBuildDetailResponseDto extends SavedBuildResponseDto {
  chiTiet: BuildItemResponseDto[];

  static fromEntity(e: SavedBuild): SavedBuildDetailResponseDto {
    const dto = new SavedBuildDetailResponseDto();
    Object.assign(dto, SavedBuildResponseDto.fromEntity(e));
    dto.chiTiet = (e.details ?? [])
      .sort((a, b) => a.thuTu - b.thuTu)
      .map(BuildItemResponseDto.fromDetail);
    return dto;
  }
}
