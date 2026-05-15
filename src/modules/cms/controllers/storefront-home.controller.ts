import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { StorefrontHomeService } from '../services/storefront-home.service';
import {
  StorefrontFlashSaleResponseDto,
  StorefrontHomepageSectionDto,
  StorefrontPromotionProductsDto,
} from '../dto/storefront-product-card.dto';

@ApiTags('Storefront — Home')
@Public()
@Controller('storefront')
export class StorefrontHomeController {
  constructor(private readonly homeService: StorefrontHomeService) {}

  @Get('homepage-sections')
  @ApiOperation({ summary: 'Danh sách section trang chủ đã resolve sản phẩm cho storefront' })
  @ApiOkResponse({ description: 'Mảng section + products đã enrich' })
  getHomepageSections(): Promise<StorefrontHomepageSectionDto[]> {
    return this.homeService.getHomepageSections();
  }

  @Get('flash-sale/active')
  @ApiOperation({ summary: 'Flash sale đang diễn ra + danh sách sản phẩm (English DTO)' })
  @ApiOkResponse({ description: 'Flash sale info + products; flashSale=null nếu không có' })
  getActiveFlashSale(): Promise<StorefrontFlashSaleResponseDto> {
    return this.homeService.getActiveFlashSale();
  }

  @Get('promotion-products')
  @ApiOperation({ summary: 'Sản phẩm thuộc các promotion đang active' })
  @ApiQuery({ name: 'maxProducts', required: false, example: 12 })
  @ApiOkResponse({ description: 'Danh sách promotion active + sản phẩm trong scope' })
  getPromotionProducts(
    @Query('maxProducts') maxProductsRaw?: string,
  ): Promise<StorefrontPromotionProductsDto> {
    const maxProducts = Math.min(Number(maxProductsRaw) || 12, 48);
    return this.homeService.getActivePromotionProducts(maxProducts);
  }
}
