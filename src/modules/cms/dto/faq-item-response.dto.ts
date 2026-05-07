import { FaqItem } from '../entities/faq-item.entity';

export class FaqItemResponseDto {
  id: string;
  groupId: string;
  groupName: string;
  question: string;
  answer: string;
  sortOrder: number;
  isVisible: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdAt: string;
  updatedAt: string;

  static from(item: FaqItem): FaqItemResponseDto {
    const dto = new FaqItemResponseDto();
    dto.id              = String(item.id);
    dto.groupId         = String(item.groupId);
    dto.groupName       = item.group?.name ?? '';
    dto.question        = item.question;
    dto.answer          = item.answer;
    dto.sortOrder       = item.sortOrder;
    dto.isVisible       = item.isVisible;
    dto.viewCount       = item.viewCount;
    dto.helpfulCount    = item.helpfulCount;
    dto.notHelpfulCount = item.notHelpfulCount;
    dto.createdAt       = item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt;
    dto.updatedAt       = item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt;
    return dto;
  }
}
