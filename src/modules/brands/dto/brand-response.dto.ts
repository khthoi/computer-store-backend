import { Brand } from '../entities/brand.entity';

export class BrandResponseDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  websiteUrl: string;
  logoUrl?: string;
  logoAlt?: string;
  active: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export function mapBrandToDto(brand: Brand, productCount = 0): BrandResponseDto {
  return {
    id: String(brand.id),
    name: brand.tenThuongHieu,
    slug: brand.slug ?? '',
    description: brand.moTa ?? '',
    websiteUrl: brand.websiteUrl ?? '',
    logoUrl: brand.logo ?? undefined,
    logoAlt: brand.logoAlt ?? undefined,
    active: brand.trangThai === 'HienThi',
    productCount,
    createdAt: '',
    updatedAt: '',
  };
}
