import { Banner } from '../entities/banner.entity';

export class BannerResponseDto {
  id: string;
  title: string;
  position: string;
  status: string;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  linkTarget: string;
  altText: string | null;
  overlayText: string | null;
  overlaySubtext: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  badge: string | null;
  badgeColor: string | null;
  badgeTextColor: string | null;
  gridX: number | null;
  gridY: number | null;
  gridW: number | null;
  gridH: number | null;
  sortOrder: number;
  startDate: string | null;
  endDate: string | null;
  clickCount: number;
  impressionCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function mapBanner(b: Banner): BannerResponseDto {
  return {
    id: String(b.id),
    title: b.title,
    position: b.position,
    status: b.status,
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    linkUrl: b.linkUrl,
    linkTarget: b.linkTarget,
    altText: b.altText,
    overlayText: b.overlayText,
    overlaySubtext: b.overlaySubtext,
    ctaLabel: b.ctaLabel,
    ctaUrl: b.ctaUrl,
    badge: b.badge,
    badgeColor: b.badgeColor,
    badgeTextColor: b.badgeTextColor,
    gridX: b.gridX,
    gridY: b.gridY,
    gridW: b.gridW,
    gridH: b.gridH,
    sortOrder: b.sortOrder,
    startDate: b.startDate?.toISOString() ?? null,
    endDate: b.endDate?.toISOString() ?? null,
    clickCount: b.clickCount,
    impressionCount: b.impressionCount,
    createdBy: b.createdBy?.hoTen ?? String(b.createdById ?? ''),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
