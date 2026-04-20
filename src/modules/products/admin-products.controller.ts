import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ProductsSearchService } from './products-search.service';
import { SpecificationsService } from '../specifications/specifications.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { UpdateProductDto, UpdateVariantDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { SaveSpecValuesDto } from '../specifications/dto/save-spec-values.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Admin — Products')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/products')
export class AdminProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly searchService: ProductsSearchService,
    private readonly specsService: SpecificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách sản phẩm (admin, bao gồm bản nháp)' })
  findAll(@Query() query: QueryProductDto) {
    return this.searchService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết sản phẩm theo ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  create(@Body() dto: CreateProductDto, @CurrentUser() user: JwtPayload) {
    return this.productsService.create(dto, user.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ẩn sản phẩm (soft delete → NgungBan)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  @Post(':id/variants')
  @ApiOperation({ summary: 'Thêm biến thể cho sản phẩm' })
  addVariant(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @Put('variants/:variantId')
  @ApiOperation({ summary: 'Cập nhật biến thể' })
  updateVariant(@Param('variantId', ParseIntPipe) variantId: number, @Body() dto: UpdateVariantDto) {
    return this.productsService.updateVariant(variantId, dto);
  }

  @Patch(':id/variants/:variantId/set-default')
  @ApiOperation({ summary: 'Đặt biến thể làm mặc định hiển thị trên listing/card' })
  setDefaultVariant(
    @Param('id', ParseIntPipe) id: number,
    @Param('variantId', ParseIntPipe) variantId: number,
  ) {
    return this.productsService.setDefaultVariant(id, variantId);
  }

  @Delete('variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Ẩn biến thể' })
  removeVariant(@Param('variantId', ParseIntPipe) variantId: number) {
    return this.productsService.removeVariant(variantId);
  }

  // ── Spec Values ───────────────────────────────────────────────────────────

  @Put(':id/variants/:variantId/specs')
  @ApiOperation({ summary: 'Lưu thông số kỹ thuật cho biến thể (replace all)' })
  saveSpecValues(
    @Param('variantId', ParseIntPipe) variantId: number,
    @Body() dto: SaveSpecValuesDto,
  ) {
    return this.specsService.saveSpecValues(variantId, dto);
  }
}
