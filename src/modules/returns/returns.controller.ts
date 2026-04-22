import {
  Controller, Get, Post, Body, Request, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { QueryReturnsDto } from './dto/query-returns.dto';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @ApiOperation({ summary: 'Gửi yêu cầu đổi/trả hàng (trong vòng thời gian cho phép)' })
  @ApiResponse({ status: 201, description: 'Yêu cầu đã được gửi, chờ duyệt' })
  @ApiResponse({ status: 403, description: 'Đơn hàng chưa giao hoặc đã hết hạn đổi trả' })
  @ApiResponse({ status: 400, description: 'Đã có yêu cầu đang chờ duyệt' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  submitReturn(@Body() dto: CreateReturnDto, @Request() req: any) {
    return this.returnsService.submitReturn(dto, req.user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách yêu cầu đổi/trả của tôi' })
  @ApiQuery({ name: 'status', required: false, enum: ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DangXuLy', 'HoanThanh'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, orderId: 15, requestType: 'TraHang',
            reason: 'HangLoiKhongDungMoTa', status: 'ChoDuyet',
            createdAt: '2024-06-05T08:00:00.000Z',
          },
        ],
        total: 1, page: 1, limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyReturns(@Request() req: any, @Query() query: QueryReturnsDto) {
    return this.returnsService.getMyReturns(req.user.sub, query);
  }
}
