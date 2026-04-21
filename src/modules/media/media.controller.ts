import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MediaService } from './media.service';

@ApiTags('Media')
@Public()
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin public của một asset' })
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
  @ApiResponse({ status: 404, description: 'Asset không tồn tại' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.findOne(id);
  }
}
