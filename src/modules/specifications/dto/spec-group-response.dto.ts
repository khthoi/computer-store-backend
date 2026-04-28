import type { SpecGroup } from '../entities/spec-group.entity';
import type { SpecType } from '../entities/spec-type.entity';

export class SpecTypeResponseDto {
  id: string;
  groupId: string;
  name: string;
  description: string;
  maKyThuat: string | null;
  displayOrder: number;
  required: boolean;
  kieuDuLieu: string;
  donVi: string | null;
  coTheLoc: boolean;
  widgetLoc: string | null;
  thuTuLoc: number;
  createdAt: string;
  updatedAt: string;

  static from(t: SpecType): SpecTypeResponseDto {
    return {
      id: String(t.id),
      groupId: String(t.nhomThongSoId),
      name: t.tenLoai,
      description: t.moTa ?? '',
      maKyThuat: t.maKyThuat ?? null,
      displayOrder: t.thuTuHienThi,
      required: t.batBuoc === 'BAT_BUOC',
      kieuDuLieu: t.kieuDuLieu,
      donVi: t.donVi ?? null,
      coTheLoc: t.coTheLoc,
      widgetLoc: t.widgetLoc ?? null,
      thuTuLoc: t.thuTuLoc,
      createdAt: '',
      updatedAt: '',
    };
  }
}

export class SpecGroupResponseDto {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  types?: SpecTypeResponseDto[];

  static from(g: SpecGroup, includeTypes = false): SpecGroupResponseDto {
    const dto: SpecGroupResponseDto = {
      id: String(g.id),
      name: g.tenNhom,
      description: '',
      createdAt: '',
      updatedAt: '',
    };
    if (includeTypes && g.types) {
      dto.types = g.types
        .sort((a, b) => a.thuTuHienThi - b.thuTuHienThi)
        .map(SpecTypeResponseDto.from);
    }
    return dto;
  }
}
