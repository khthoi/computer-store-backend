import type { CategorySpecGroup } from '../entities/category-spec-group.entity';

// Map backend hanhDong values to frontend assignmentType values
function mapHanhDong(hanhDong: string): 'include' | 'exclude' | 'ghi_de_thu_tu' {
  if (hanhDong === 'loai_tru') return 'exclude';
  if (hanhDong === 'ghi_de_thu_tu') return 'ghi_de_thu_tu';
  return 'include'; // 'hien_thi' → 'include'
}

export function mapAssignmentTypeToHanhDong(
  assignmentType: 'include' | 'exclude' | 'ghi_de_thu_tu',
): string {
  if (assignmentType === 'exclude') return 'loai_tru';
  if (assignmentType === 'ghi_de_thu_tu') return 'ghi_de_thu_tu';
  return 'hien_thi'; // 'include' → 'hien_thi'
}

export class CategorySpecGroupResponseDto {
  id: string;
  categoryId: string;
  specGroupId: string;
  assignmentType: 'include' | 'exclude' | 'ghi_de_thu_tu';
  displayOrder: number;
  hienThiBoLoc: boolean;
  thuTuBoLoc: number;
  createdAt: string;

  static from(link: CategorySpecGroup): CategorySpecGroupResponseDto {
    return {
      id: String(link.id),
      categoryId: String(link.danhMucId),
      specGroupId: String(link.nhomThongSoId),
      assignmentType: mapHanhDong(link.hanhDong),
      displayOrder: link.thuTuHienThi,
      hienThiBoLoc: link.hienThiBoLoc,
      thuTuBoLoc: link.thuTuBoLoc,
      createdAt: '',
    };
  }
}
