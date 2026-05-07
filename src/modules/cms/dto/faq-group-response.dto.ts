import { FaqGroup } from '../entities/faq-group.entity';

export class FaqGroupResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isVisible: boolean;
  itemCount: number;
  createdAt: string;
  updatedAt: string;

  static from(group: FaqGroup & { itemCount?: number }): FaqGroupResponseDto {
    const dto = new FaqGroupResponseDto();
    dto.id          = String(group.id);
    dto.name        = group.name;
    dto.slug        = group.slug;
    dto.description = group.description ?? undefined;
    dto.icon        = group.icon ?? undefined;
    dto.sortOrder   = group.sortOrder;
    dto.isVisible   = group.isVisible;
    dto.itemCount   = group.itemCount ?? 0;
    dto.createdAt   = group.createdAt instanceof Date ? group.createdAt.toISOString() : group.createdAt;
    dto.updatedAt   = group.updatedAt instanceof Date ? group.updatedAt.toISOString() : group.updatedAt;
    return dto;
  }
}
