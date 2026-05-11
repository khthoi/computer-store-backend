import { CompatibilityRule } from '../entities/compatibility-rule.entity';

// Normalize legacy loai_kiem_tra values from the DB to current naming convention
const LOAI_KIEM_TRA_MAP: Record<string, string> = {
  value_match: 'exact_match',
  numeric_min: 'min_value',
};

const VALID_LOAI_KIEM_TRA = new Set(['exact_match', 'contains', 'min_sum', 'min_value']);

// Fallback label map — authoritative source is loai_thong_so.ten_loai via the tech-keys endpoint
const TECH_KEY_LABELS: Record<string, string> = {
  socket:        'Socket',
  ram_type:      'Loại RAM',
  psu_wattage:   'Công suất (W)',
  tdp:           'TDP (W)',
  gpu_tdp:       'TDP GPU (W)',
  ram_speed:     'Tốc độ RAM',
  max_ram:       'RAM tối đa',
  form_factor:   'Form Factor',
};

export class CompatibilityRuleResponseDto {
  id: string;
  slotNguonId: string;
  slotNguonTen: string;
  slotDichId: string;
  slotDichTen: string;
  maKyThuat: string;
  maKyThuatTen: string;
  loaiKiemTra: string;
  giaTriMacDinh?: string;
  heSo?: number;
  moTa?: string;
  batBuoc: boolean;
  isActive: boolean;
  ngayTao: string;
  ngayCapNhat: string;

  static fromEntity(e: CompatibilityRule): CompatibilityRuleResponseDto {
    const dto = new CompatibilityRuleResponseDto();
    dto.id = String(e.id);
    dto.slotNguonId = String(e.slotNguonId);
    dto.slotNguonTen = e.slotNguon?.tenSlot ?? '';
    dto.slotDichId = e.slotDichId ? String(e.slotDichId) : '';
    dto.slotDichTen = e.slotDich?.tenSlot ?? '';
    dto.maKyThuat = e.maKtNguon;
    dto.maKyThuatTen = TECH_KEY_LABELS[e.maKtNguon] ?? e.maKtNguon;
    const normalizedLoai = LOAI_KIEM_TRA_MAP[e.loaiKiemTra] ?? e.loaiKiemTra;
    dto.loaiKiemTra = VALID_LOAI_KIEM_TRA.has(normalizedLoai) ? normalizedLoai : 'exact_match';
    dto.giaTriMacDinh = e.giaTriMacDinh ?? undefined;
    dto.heSo = ['min_sum', 'min_value'].includes(dto.loaiKiemTra) ? Number(e.heSo) : undefined;
    dto.moTa = e.thongBaoLoi || undefined;
    dto.batBuoc = Boolean(e.batBuoc);
    dto.isActive = Boolean(e.isActive);
    dto.ngayTao = e.ngayTao.toISOString();
    dto.ngayCapNhat = e.ngayCapNhat.toISOString();
    return dto;
  }
}
