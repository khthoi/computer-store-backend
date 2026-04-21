import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { FlashSalesService } from './flash-sales.service';

@ApiTags('Flash Sales')
@Controller('flash-sales')
export class FlashSalesController {
  constructor(private readonly flashSalesService: FlashSalesService) {}

  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Flash sale đang diễn ra (dùng cho trang chủ / countdown)' })
  @ApiOkResponse({
    schema: {
      example: {
        id: 3,
        ten: 'Flash Sale Cuối Tuần',
        trangThai: 'dang_dien_ra',
        batDau: '2024-06-01T10:00:00.000Z',
        ketThuc: '2024-06-01T14:00:00.000Z',
        bannerTitle: 'Giảm sốc cuối tuần',
        bannerImageUrl: 'https://res.cloudinary.com/pc-store/image/upload/banners/fs3.jpg',
        items: [
          { id: 10, phienBanId: 42, giaFlash: 9990000, giaGocSnapshot: 12900000, soLuongGioiHan: 50, soLuongDaBan: 23, thuTuHienThi: 1 },
        ],
      },
    },
  })
  findActive() {
    return this.flashSalesService.findActive();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết flash sale theo ID' })
  @ApiParam({ name: 'id', example: 3 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 3,
        ten: 'Flash Sale Cuối Tuần',
        trangThai: 'dang_dien_ra',
        batDau: '2024-06-01T10:00:00.000Z',
        ketThuc: '2024-06-01T14:00:00.000Z',
        items: [
          { id: 10, phienBanId: 42, giaFlash: 9990000, giaGocSnapshot: 12900000, soLuongGioiHan: 50, soLuongDaBan: 23, thuTuHienThi: 1 },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Flash sale không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.flashSalesService.findOne(id);
  }
}
