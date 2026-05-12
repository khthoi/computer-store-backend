import { ApiProperty } from '@nestjs/swagger';

export class PublicTrustBadgeDto {
  @ApiProperty({ example: 'tb-1' })
  id: string;

  @ApiProperty({ example: 'TruckIcon' })
  icon: string;

  @ApiProperty({ example: 'Mien phi giao hang' })
  title: string;

  @ApiProperty({ example: 'Don tu 500.000d', nullable: true })
  subtitle: string | null;

  @ApiProperty({ example: 1 })
  sortOrder: number;
}

export class PublicCategoryShortcutDto {
  @ApiProperty({ example: 'cs-1' })
  id: string;

  @ApiProperty({ example: '💻', nullable: true })
  emoji: string | null;

  @ApiProperty({ example: '/svg/computer-components-laptop.svg', nullable: true })
  iconUrl: string | null;

  @ApiProperty({ example: 'Laptop' })
  label: string;

  @ApiProperty({ example: '/products/laptop' })
  url: string;

  @ApiProperty({ example: 1 })
  sortOrder: number;
}

export class PublicHomepageContentDto {
  @ApiProperty({
    example: {
      hero: [],
      heroSlider: [],
      smallPromo: [],
    },
  })
  banners: {
    hero: unknown[];
    heroSlider: unknown[];
    smallPromo: unknown[];
  };

  @ApiProperty({ type: [PublicTrustBadgeDto] })
  trustBadges: PublicTrustBadgeDto[];

  @ApiProperty({ type: [PublicCategoryShortcutDto] })
  categoryShortcuts: PublicCategoryShortcutDto[];
}
