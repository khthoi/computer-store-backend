import { Page } from '../entities/page.entity';

const STATUS_TO_FRONTEND: Record<string, 'draft' | 'published' | 'archived'> = {
  nhap: 'draft',
  da_xuat_ban: 'published',
  an: 'archived',
};

export class PageResponseDto {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  content: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string;
    ogImage?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  };
  template: string;
  showInFooter: boolean;
  showInHeader: boolean;
  sortOrder: number;
  viewCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export function toPageResponse(entity: Page): PageResponseDto {
  return {
    id: String(entity.id),
    title: entity.title,
    slug: entity.slug,
    status: STATUS_TO_FRONTEND[entity.status] ?? 'draft',
    content: entity.content,
    seo: {
      title: entity.metaTitle ?? undefined,
      description: entity.metaDescription ?? undefined,
      keywords: entity.metaKeywords ?? undefined,
      ogImage: entity.ogImage ?? undefined,
      canonicalUrl: entity.canonicalUrl ?? undefined,
      noIndex: entity.noIndex,
    },
    template: entity.template ?? 'default',
    showInFooter: entity.showInFooter,
    showInHeader: entity.showInHeader,
    sortOrder: entity.sortOrder,
    viewCount: entity.viewCount,
    createdBy: entity.createdBy?.hoTen ?? 'Admin',
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    publishedAt: entity.publishedAt ? entity.publishedAt.toISOString() : null,
  };
}
