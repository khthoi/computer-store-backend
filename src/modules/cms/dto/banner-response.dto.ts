import { Banner } from '../entities/banner.entity';

export class PublicBannerDto {
  id: string;
  title: string;
  position: string;
  status: string;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  sidePlacement: 'left' | 'right' | null;
  linkUrl: string | null;
  linkTarget: string;
  altText: string | null;
  caption: string | null;
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
}

export class BannerResponseDto {
  id: string;
  title: string;
  position: string;
  status: 'draft' | 'active';
  isEnabled: boolean;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  sidePlacement: 'left' | 'right' | null;
  linkUrl: string | null;
  linkTarget: string;
  altText: string | null;
  caption: string | null;
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
  clickCount: number;
  impressionCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeBannerStatus(status: string | null | undefined): 'draft' | 'active' {
  return status === 'active' ? 'active' : 'draft';
}

function resolveBannerEnabled(banner: Pick<Banner, 'isEnabled' | 'status'>): boolean {
  if (typeof banner.isEnabled === 'boolean') return banner.isEnabled;
  return normalizeBannerStatus(banner.status) === 'active';
}

export function mapPublicBanner(b: Banner): PublicBannerDto {
  return {
    id: String(b.id),
    title: b.title,
    position: b.position,
    status: normalizeBannerStatus(b.status),
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    sidePlacement: b.sidePlacement,
    linkUrl: b.linkUrl,
    linkTarget: b.linkTarget,
    altText: b.altText,
    caption: b.caption,
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
  };
}

export function mapBanner(b: Banner): BannerResponseDto {
  return {
    id: String(b.id),
    title: b.title,
    position: b.position,
    status: normalizeBannerStatus(b.status),
    isEnabled: resolveBannerEnabled(b),
    imageUrl: b.imageUrl,
    mobileImageUrl: b.mobileImageUrl,
    sidePlacement: b.sidePlacement,
    linkUrl: b.linkUrl,
    linkTarget: b.linkTarget,
    altText: b.altText,
    caption: b.caption,
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
    clickCount: b.clickCount,
    impressionCount: b.impressionCount,
    createdBy: b.createdBy?.hoTen ?? String(b.createdById ?? ''),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
