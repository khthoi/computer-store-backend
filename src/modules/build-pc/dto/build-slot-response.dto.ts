import { BuildSlot } from '../entities/build-slot.entity';

export class BuildSlotResponseDto {
  id: string;
  tenKhe: string;
  maKhe: string;
  danhMucId: number;
  danhMucTen: string;
  danhMucSlug: string;
  soLuong: number;
  batBuoc: boolean;
  thuTu: number;
  moTa: string | undefined;
  isActive: boolean;
  ngayTao: string;
  ngayCapNhat: string;

  static fromEntity(e: BuildSlot): BuildSlotResponseDto {
    const dto = new BuildSlotResponseDto();
    dto.id = String(e.id);
    dto.tenKhe = e.tenSlot;
    dto.maKhe = e.maKhe;
    dto.danhMucId = e.danhMucId;
    dto.danhMucTen = e.danhMuc?.tenDanhMuc ?? '';
    dto.danhMucSlug = e.danhMuc?.slug ?? '';
    dto.soLuong = e.soLuongMax;
    dto.batBuoc = e.batBuoc;
    dto.thuTu = e.thuTu;
    dto.moTa = e.moTa ?? undefined;
    dto.isActive = e.isActive;
    dto.ngayTao = e.ngayTao.toISOString();
    dto.ngayCapNhat = e.ngayCapNhat.toISOString();
    return dto;
  }
}
