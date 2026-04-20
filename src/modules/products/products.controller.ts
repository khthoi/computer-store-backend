import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ProductsService } from './products.service';
import { ProductsSearchService } from './products-search.service';
import { SpecificationsService } from '../specifications/specifications.service';
import { QueryProductDto } from './dto/query-product.dto';

@ApiTags('Products')
@Public()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly searchService: ProductsSearchService,
    private readonly specsService: SpecificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm (filter / paginate)' })
  findAll(@Query() query: QueryProductDto) {
    return this.searchService.findAll(query);
  }

  @Get(':id/specs')
  @ApiOperation({ summary: 'Thông số kỹ thuật theo phiên bản sản phẩm (variantId)' })
  findSpecsByVariant(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.findValuesByVariant(id);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Chi tiết sản phẩm theo slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }
}
