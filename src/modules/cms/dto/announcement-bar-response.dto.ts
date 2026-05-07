import { AnnouncementBar } from '../entities/announcement-bar.entity';

export class AnnouncementBarResponseDto {
  id: string;
  name: string;
  status: string;
  position: string;
  content: string;
  backgroundColor: string;
  textColor: string;
  showCloseButton: boolean;
  isScrolling: boolean;
  linkUrl: string | null;
  linkLabel: string | null;
  startDate: string | null;
  endDate: string | null;
  viewCount: number;
  clickCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  static fromEntity(entity: AnnouncementBar): AnnouncementBarResponseDto {
    const dto = new AnnouncementBarResponseDto();
    dto.id = String(entity.id);
    dto.name = entity.name;
    dto.status = entity.status;
    dto.position = entity.position;
    dto.content = entity.content;
    dto.backgroundColor = entity.backgroundColor;
    dto.textColor = entity.textColor;
    dto.showCloseButton = entity.showCloseButton;
    dto.isScrolling = entity.isScrolling;
    dto.linkUrl = entity.linkUrl;
    dto.linkLabel = entity.linkLabel;
    dto.startDate = entity.startDate ? entity.startDate.toISOString() : null;
    dto.endDate = entity.endDate ? entity.endDate.toISOString() : null;
    dto.viewCount = entity.viewCount;
    dto.clickCount = entity.clickCount;
    dto.createdBy = entity.createdByEmployee?.hoTen ?? 'Admin';
    dto.createdAt = entity.createdAt.toISOString();
    dto.updatedAt = entity.updatedAt.toISOString();
    return dto;
  }
}
