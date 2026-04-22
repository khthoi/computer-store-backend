import {
  Controller, Get, Post, Body, Query, Request,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Tìm kiếm sản phẩm full-text (MySQL FULLTEXT)' })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            san_pham_id: 1, ten_san_pham: 'CPU Intel Core i9-14900K', slug: 'cpu-intel-core-i9-14900k',
            diem_danh_gia_tb: '4.80', so_luot_danh_gia: 23,
            phien_ban_id: 3, gia_ban: '12990000.00', variant_status: 'HienThi',
          },
        ],
        total: 1, page: 1, limit: 20,
      },
    },
  })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }

  @Get('suggestions')
  @Public()
  @ApiOperation({ summary: 'Gợi ý tìm kiếm (autocomplete)' })
  @ApiQuery({ name: 'q', required: true, example: 'intel' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, name: 'Intel Core i9-14900K', slug: 'cpu-intel-core-i9-14900k' },
      ],
    },
  })
  suggestions(@Query('q') q: string) {
    return this.searchService.suggestions(q ?? '');
  }

  @Post('history')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Ghi lại lịch sử xem sản phẩm' })
  recordView(@Body('variantId') variantId: number, @Request() req) {
    return this.searchService.recordView(req.user.id, variantId);
  }

  @Get('history')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lịch sử sản phẩm đã xem gần đây (20 sản phẩm)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 10, variantId: 3, viewedAt: '2024-06-01T10:00:00.000Z',
          variantName: 'Intel Core i9-14900K', gia_ban: '12990000.00',
          productName: 'CPU Intel Core i9', slug: 'cpu-intel-core-i9-14900k',
        },
      ],
    },
  })
  getHistory(@Request() req) {
    return this.searchService.getViewHistory(req.user.id);
  }
}
