import {
  Controller, Get, Put, Body, Param, ParseIntPipe, Request, Query,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiParam, ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReturnsService } from './returns.service';
import { QueryReturnsDto } from './dto/query-returns.dto';
import { ProcessReturnDto } from './dto/process-return.dto';

@ApiTags('Admin — Returns')
@ApiBearerAuth()
@Controller('admin/returns')
@Roles('admin', 'staff')
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách tất cả yêu cầu đổi/trả (có lọc theo trạng thái)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ChoDuyet', 'DaDuyet', 'TuChoi', 'DangXuLy', 'HoanThanh'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 1, orderId: 15, customerId: 3, requestType: 'TraHang',
            reason: 'HangLoiKhongDungMoTa', status: 'ChoDuyet',
            processedById: null, inspectionResult: null, resolution: null,
            createdAt: '2024-06-05T08:00:00.000Z',
          },
        ],
        total: 1, page: 1, limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryReturnsDto) {
    return this.returnsService.findAll(query);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Xử lý yêu cầu đổi/trả — duyệt, từ chối, hoàn thành' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiResponse({ status: 200, description: 'Trạng thái đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Yêu cầu không tồn tại' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  processReturn(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ProcessReturnDto,
    @Request() req: any,
  ) {
    const employeeId = req.user?.employeeId ?? req.user?.sub;
    return this.returnsService.processReturn(id, dto, employeeId);
  }

  @Get(':id/assets')
  @ApiOperation({ summary: 'Danh sách ảnh bằng chứng của yêu cầu đổi/trả' })
  @ApiParam({ name: 'id', example: 1, description: 'ID yêu cầu đổi/trả' })
  @ApiOkResponse({
    schema: {
      example: [{ id: 1, returnRequestId: 1, assetId: 12, sortOrder: 0 }],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  getAssets(@Param('id', ParseIntPipe) id: number) {
    return this.returnsService.getReturnAssets(id);
  }
}
