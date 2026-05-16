import {
  Controller, Get, Post, Body, Request, Query, Param, ParseIntPipe,
  UploadedFiles, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags, ApiOperation, ApiOkResponse, ApiResponse,
  ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto, RETURN_REASON_CODES } from './dto/create-return.dto';
import { QueryReturnsDto } from './dto/query-returns.dto';
import { MediaService } from '../media/media.service';

@ApiTags('Returns')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(
    private readonly returnsService: ReturnsService,
    private readonly mediaService: MediaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Gửi yêu cầu đổi/trả hàng — multipart/form-data, ảnh bằng chứng trong field images[]' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'integer', example: 15 },
        requestType: { type: 'string', enum: ['DoiHang', 'TraHang', 'BaoHanh'] },
        reason: { type: 'string', enum: [...RETURN_REASON_CODES] },
        description: { type: 'string' },
        items: {
          type: 'string',
          description: 'JSON-encoded array [{variantId, quantity}, …]',
          example: '[{"variantId":12,"quantity":1}]',
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Tối đa 5 ảnh bằng chứng, mỗi ảnh ≤ 10MB',
        },
      },
      required: ['orderId', 'requestType', 'reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Yêu cầu đã được gửi, chờ duyệt' })
  @ApiResponse({ status: 403, description: 'Đơn hàng chưa giao hoặc đã hết hạn đổi trả' })
  @ApiResponse({ status: 400, description: 'Đã có yêu cầu đang chờ duyệt' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FilesInterceptor('images', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async submitReturn(
    @Body() dto: CreateReturnDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @Request() req: any,
  ) {
    // Upload each evidence file to Cloudinary and collect the resulting asset IDs.
    // Merge with any explicit `assetIds` passed in the body (legacy/admin-tool path).
    const uploadedIds: number[] = [];
    for (const file of files) {
      const asset = await this.mediaService.uploadCustomerEvidence(file);
      uploadedIds.push(asset.id);
    }
    const mergedAssetIds = [
      ...(dto.assetIds ?? []),
      ...uploadedIds,
    ];
    return this.returnsService.submitReturn(
      { ...dto, assetIds: mergedAssetIds },
      req.user.sub,
    );
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

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết yêu cầu đổi/trả của tôi' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyReturnDetail(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.returnsService.getMyReturnDetail(id, req.user.sub);
  }
}
