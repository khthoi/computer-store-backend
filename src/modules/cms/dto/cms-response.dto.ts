import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BannerResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Banner khuyến mãi Tết' }) title: string;
  @ApiPropertyOptional({ example: 'Giảm đến 50%' }) subtitle: string | null;
  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner.jpg' }) imageUrl: string | null;
  @ApiPropertyOptional({ example: 'https://cdn.example.com/banner-m.jpg' }) imageUrlMobile: string | null;
  @ApiPropertyOptional({ example: 'Banner khuyến mãi' }) altText: string | null;
  @ApiPropertyOptional({ example: '/flash-sales' }) targetUrl: string | null;
  @ApiPropertyOptional({ example: 'Mua ngay' }) buttonText: string | null;
  @ApiPropertyOptional({ example: '/flash-sales' }) buttonUrl: string | null;
  @ApiProperty({ example: 'TrangChu' }) position: string;
  @ApiProperty({ example: 1 }) sortOrder: number;
  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' }) startAt: Date | null;
  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z' }) endAt: Date | null;
  @ApiProperty({ example: 'DangHienThi' }) status: string;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) createdAt: Date;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) updatedAt: Date;
}

export class PageListItemResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'static' }) type: string;
  @ApiProperty({ example: 'chinh-sach-bao-mat' }) slug: string;
  @ApiProperty({ example: 'Chính sách bảo mật' }) title: string;
  @ApiProperty({ example: true }) showInFooter: boolean;
  @ApiProperty({ example: 1 }) sortOrder: number;
  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z' }) publishedAt: Date | null;
}

export class PageResponseDto extends PageListItemResponseDto {
  @ApiProperty({ example: '<p>Nội dung trang...</p>' }) content: string;
  @ApiProperty({ example: 'da_xuat_ban' }) status: string;
  @ApiPropertyOptional({ example: 'Chính sách bảo mật | PC Store' }) metaTitle: string | null;
  @ApiPropertyOptional({ example: 'Chính sách bảo mật của PC Store...' }) metaDescription: string | null;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) createdAt: Date;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) updatedAt: Date;
}

export class PopupResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Thông báo khuyến mãi' }) title: string;
  @ApiProperty({ example: 'Nhận ngay voucher 50k khi đăng ký' }) content: string;
  @ApiProperty({ example: 'popup_center' }) type: string;
  @ApiPropertyOptional({ example: '#FF5733' }) bgColor: string | null;
  @ApiPropertyOptional({ example: '#FFFFFF' }) textColor: string | null;
  @ApiPropertyOptional({ example: '/register' }) actionUrl: string | null;
  @ApiPropertyOptional({ example: 'Đăng ký ngay' }) actionLabel: string | null;
  @ApiProperty({ example: 'hoat_dong' }) status: string;
  @ApiProperty({ example: 0 }) sortOrder: number;
  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' }) startAt: Date | null;
  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z' }) endAt: Date | null;
  @ApiProperty({ example: true }) allowClose: boolean;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) createdAt: Date;
}

export class FaqItemResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 1 }) groupId: number;
  @ApiProperty({ example: 'Chính sách bảo hành như thế nào?' }) question: string;
  @ApiProperty({ example: 'Sản phẩm được bảo hành 12 tháng...' }) answer: string;
  @ApiProperty({ example: 1 }) sortOrder: number;
  @ApiProperty({ example: true }) isVisible: boolean;
  @ApiProperty({ example: 42 }) helpfulCount: number;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) createdAt: Date;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) updatedAt: Date;
}

export class FaqGroupResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Chính sách mua hàng' }) name: string;
  @ApiProperty({ example: 'chinh-sach-mua-hang' }) slug: string;
  @ApiPropertyOptional({ example: 'Các câu hỏi về chính sách' }) description: string | null;
  @ApiProperty({ example: 1 }) sortOrder: number;
  @ApiProperty({ example: true }) isVisible: boolean;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) createdAt: Date;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) updatedAt: Date;
  @ApiPropertyOptional({ type: [FaqItemResponseDto] }) items?: FaqItemResponseDto[];
}

export class MenuItemResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 1 }) menuId: number;
  @ApiPropertyOptional({ example: null }) parentId: number | null;
  @ApiProperty({ example: 'Sản phẩm' }) label: string;
  @ApiProperty({ example: '/products' }) url: string;
  @ApiProperty({ example: 'link' }) type: string;
  @ApiProperty({ example: 1 }) sortOrder: number;
  @ApiProperty({ example: true }) isVisible: boolean;
  @ApiProperty({ example: false }) openInNewTab: boolean;
  @ApiProperty({ type: () => [MenuItemResponseDto] }) children: MenuItemResponseDto[];
}

export class MenuResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'header' }) position: string;
  @ApiProperty({ example: 'Menu chính' }) name: string;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) updatedAt: Date;
  @ApiProperty({ type: [MenuItemResponseDto] }) items: MenuItemResponseDto[];
}

export class HomepageSectionItemResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 5 }) variantId: number;
  @ApiProperty({ example: 1 }) sortOrder: number;
}

export class HomepageSectionResponseDto {
  @ApiProperty({ example: 1 }) id: number;
  @ApiProperty({ example: 'Sản phẩm nổi bật' }) title: string;
  @ApiPropertyOptional({ example: 'Lựa chọn của tuần' }) subtitle: string | null;
  @ApiPropertyOptional({ example: '/products?featured=1' }) viewAllUrl: string | null;
  @ApiProperty({ example: 'manual' }) type: string;
  @ApiProperty({ example: 'carousel' }) layout: string;
  @ApiProperty({ example: 8 }) maxProducts: number;
  @ApiProperty({ example: true }) isVisible: boolean;
  @ApiProperty({ example: 1 }) sortOrder: number;
  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' }) startAt: Date | null;
  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z' }) endAt: Date | null;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) createdAt: Date;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) updatedAt: Date;
  @ApiProperty({ type: [HomepageSectionItemResponseDto] }) items: HomepageSectionItemResponseDto[];
}

export class SiteConfigResponseDto {
  @ApiProperty({ example: 'return_window_days' }) key: string;
  @ApiProperty({ example: '7' }) value: string;
  @ApiPropertyOptional({ example: 3 }) updatedById: number | null;
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' }) updatedAt: Date;
}
