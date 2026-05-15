import { FaqGroup } from '../entities/faq-group.entity';
import { FaqItem } from '../entities/faq-item.entity';

export class FaqPublicItemDto {
  id: string;
  question: string;
  answer: string;
  helpfulCount: number;

  static from(item: FaqItem): FaqPublicItemDto {
    const dto = new FaqPublicItemDto();
    dto.id           = String(item.id);
    dto.question     = item.question;
    dto.answer       = item.answer;
    dto.helpfulCount = item.helpfulCount ?? 0;
    return dto;
  }
}

export class FaqPublicGroupDto {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  items: FaqPublicItemDto[];

  static from(group: FaqGroup): FaqPublicGroupDto {
    const dto = new FaqPublicGroupDto();
    dto.id          = String(group.id);
    dto.name        = group.name;
    dto.slug        = group.slug;
    dto.description = group.description ?? undefined;
    dto.icon        = group.icon ?? undefined;
    dto.sortOrder   = group.sortOrder;
    dto.items = (group.items ?? [])
      .filter((i) => i.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(FaqPublicItemDto.from);
    return dto;
  }
}
