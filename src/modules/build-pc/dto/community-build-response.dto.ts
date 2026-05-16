import { MySavedBuildDetailDto, MySavedBuildSummaryDto } from './my-saved-build-response.dto';

export interface CommunityBuildThumbnail {
  url: string;
  slotCode: string;
  slotName: string;
  productSlug: string;
  variantId: number;
  productName: string;
  variantName: string;
}

export class CommunityBuildSummaryDto extends MySavedBuildSummaryDto {
  authorName: string | null;
  authorAvatar: string | null;
  views: number;
  clones: number;
  /** All line-item thumbnails — ordered with priority slots (MAIN/CPU/RAM/GPU) first. */
  thumbnails: CommunityBuildThumbnail[];
}

export class CommunityBuildDetailDto extends MySavedBuildDetailDto {
  authorName: string | null;
  authorAvatar: string | null;
  views: number;
  clones: number;
}

export class CommunityBuildListResponseDto {
  data: CommunityBuildSummaryDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
