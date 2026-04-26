import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody, ApiQuery, ApiOkResponse, ApiParam, ApiResponse } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { MediaFolderService } from './media-folder.service';
import { QueryMediaDto } from './dto/query-media.dto';
import { CreateMediaFolderDto } from './dto/create-media-folder.dto';
import { UpdateMediaFolderDto } from './dto/update-media-folder.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Admin — Media')
@ApiBearerAuth('access-token')
@Roles('admin', 'staff')
@Controller('admin/media')
export class AdminMediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly folderService: MediaFolderService,
  ) {}

  // ── Upload ────────────────────────────────────────────────────────────────

  @Post('upload')
  @ApiOperation({ summary: 'Upload file lên Cloudinary (folder phải nằm trong danh sách cấu hình)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folder: { type: 'string', example: 'pc-store/products', description: 'Đường dẫn thư mục (phải khớp với cấu hình)' },
        thuMucId: { type: 'number', description: 'ID thư mục (thay thế cho folder path)' },
        altText: { type: 'string', description: 'Alt text cho hình ảnh' },
        caption: { type: 'string', description: 'Caption/mô tả file' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @Body('folder') folder?: string,
    @Body('thuMucId') thuMucId?: string,
    @Body('altText') altText?: string,
    @Body('caption') caption?: string,
  ) {
    return this.mediaService.upload(file, user.sub, {
      folderPath: folder,
      thuMucId: thuMucId ? Number(thuMucId) : undefined,
      altText,
      caption,
    });
  }

  // ── Folder Configuration (static routes first to avoid :id conflicts) ─────

  @Get('folders')
  @ApiOperation({ summary: 'Danh sách thư mục Cloudinary đã cấu hình' })
  @ApiQuery({ name: 'onlyActive', required: false, type: Boolean, description: 'Chỉ lấy thư mục đang hoạt động' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, name: 'Products', path: 'pc-store/products', isActive: true, maxFileSize: 10485760 },
        { id: 2, name: 'Banners', path: 'pc-store/banners', isActive: true, maxFileSize: 5242880 },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findFolders(@Query('onlyActive') onlyActive?: string) {
    return this.folderService.findAll(onlyActive === 'true');
  }

  @Post('folders')
  @Roles('admin')
  @ApiOperation({ summary: 'Tạo cấu hình thư mục Cloudinary mới' })
  createFolder(@Body() dto: CreateMediaFolderDto) {
    return this.folderService.create(dto);
  }

  @Get('folders/:id')
  @ApiOperation({ summary: 'Chi tiết cấu hình thư mục' })
  @ApiParam({ name: 'id', description: 'ID của thư mục', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 1,
        name: 'Products',
        path: 'pc-store/products',
        isActive: true,
        maxFileSize: 10485760,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Thư mục không tồn tại' })
  findFolder(@Param('id', ParseIntPipe) id: number) {
    return this.folderService.findOne(id);
  }

  @Put('folders/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Cập nhật cấu hình thư mục' })
  updateFolder(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateMediaFolderDto) {
    return this.folderService.update(id, dto);
  }

  @Delete('folders/:id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá cấu hình thư mục' })
  removeFolder(@Param('id', ParseIntPipe) id: number) {
    return this.folderService.remove(id);
  }

  // ── Assets ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Danh sách media assets' })
  @ApiQuery({ name: 'folder', required: false, type: String, description: 'Lọc theo folder path' })
  @ApiQuery({ name: 'resourceType', required: false, type: String, description: 'Lọc theo loại tài nguyên (image, video, raw)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Trang hiện tại', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng mỗi trang', example: 20 })
  @ApiOkResponse({
    schema: {
      example: {
        items: [
          {
            id: 45,
            url: 'https://res.cloudinary.com/pc-store/image/upload/products/cpu.jpg',
            folder: 'pc-store/products',
            format: 'jpg',
            size: 204800,
          },
        ],
        total: 120,
        page: 1,
        limit: 20,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  findAll(@Query() query: QueryMediaDto) {
    return this.mediaService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một asset' })
  @ApiParam({ name: 'id', description: 'ID của media asset', example: 45 })
  @ApiOkResponse({
    schema: {
      example: {
        id: 45,
        url: 'https://res.cloudinary.com/pc-store/image/upload/products/cpu.jpg',
        publicId: 'pc-store/products/cpu',
        resourceType: 'image',
        format: 'jpg',
        width: 800,
        height: 800,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Asset không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.findOne(id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archive asset (ẩn khỏi thư viện)' })
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Xoá asset (Cloudinary + DB)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.remove(id);
  }
}
