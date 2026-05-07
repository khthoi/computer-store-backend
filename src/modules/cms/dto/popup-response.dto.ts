import { Popup } from '../entities/popup.entity';

export class PopupResponseDto {
  id: string;
  name: string;
  status: string;
  position: string;
  trigger: string;
  delaySeconds: number | null;
  scrollPercent: number | null;
  title: string | null;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  showCloseButton: boolean;
  showOnce: boolean;
  targetPages: string[];
  startDate: string | null;
  endDate: string | null;
  viewCount: number;
  clickCount: number;
  closeCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(entity: Popup): PopupResponseDto {
    const dto = new PopupResponseDto();
    dto.id = String(entity.id);
    dto.name = entity.name;
    dto.status = entity.status;
    dto.position = entity.position;
    dto.trigger = entity.trigger;
    dto.delaySeconds = entity.delaySeconds;
    dto.scrollPercent = entity.scrollPercent;
    dto.title = entity.title;
    dto.body = entity.body;
    dto.imageUrl = entity.imageUrl;
    dto.ctaLabel = entity.ctaLabel;
    dto.ctaUrl = entity.ctaUrl;
    dto.showCloseButton = entity.showCloseButton;
    dto.showOnce = entity.showOnce;
    dto.targetPages = entity.targetPages ?? [];
    dto.startDate = entity.startDate ? entity.startDate.toISOString() : null;
    dto.endDate = entity.endDate ? entity.endDate.toISOString() : null;
    dto.viewCount = entity.viewCount;
    dto.clickCount = entity.clickCount;
    dto.closeCount = entity.closeCount;
    dto.createdBy = entity.createdByEmployee?.hoTen ?? 'Admin';
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
