import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SpecificationsService } from './specifications.service';

@ApiTags('Specifications')
@Public()
@Controller('specs')
export class SpecificationsController {
  constructor(private readonly specsService: SpecificationsService) {}

  @Get('groups')
  @ApiOperation({ summary: 'Tất cả nhóm thông số (kèm loại)' })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Thông số GPU',
          displayOrder: 1,
          types: [
            { id: 1, name: 'Chip đồ họa', unit: null, displayOrder: 1 },
            { id: 2, name: 'Bộ nhớ VRAM', unit: 'GB', displayOrder: 2 },
            { id: 3, name: 'Tốc độ xung nhịp', unit: 'MHz', displayOrder: 3 },
          ],
        },
        {
          id: 2,
          name: 'Thông số CPU',
          displayOrder: 2,
          types: [
            { id: 4, name: 'Số nhân', unit: 'nhân', displayOrder: 1 },
            { id: 5, name: 'Số luồng', unit: 'luồng', displayOrder: 2 },
            { id: 6, name: 'Xung nhịp cơ bản', unit: 'GHz', displayOrder: 3 },
          ],
        },
      ],
    },
  })
  findAllGroups() {
    return this.specsService.findAllGroups();
  }

  @Get('types')
  @ApiOperation({ summary: 'Tất cả loại thông số' })
  @ApiOkResponse({
    schema: {
      example: [
        { id: 1, name: 'Chip đồ họa', unit: null, groupId: 1, groupName: 'Thông số GPU', displayOrder: 1 },
        { id: 2, name: 'Bộ nhớ VRAM', unit: 'GB', groupId: 1, groupName: 'Thông số GPU', displayOrder: 2 },
        { id: 4, name: 'Số nhân', unit: 'nhân', groupId: 2, groupName: 'Thông số CPU', displayOrder: 1 },
        { id: 5, name: 'Số luồng', unit: 'luồng', groupId: 2, groupName: 'Thông số CPU', displayOrder: 2 },
      ],
    },
  })
  findAllTypes() {
    return this.specsService.findAllTypes();
  }

  @Get('categories/:id/groups')
  @ApiOperation({ summary: 'Nhóm thông số theo danh mục' })
  @ApiParam({ name: 'id', description: 'ID của danh mục', example: 3 })
  @ApiOkResponse({
    schema: {
      example: [
        {
          id: 1,
          name: 'Thông số GPU',
          displayOrder: 1,
          types: [
            { id: 1, name: 'Chip đồ họa', unit: null, displayOrder: 1 },
            { id: 2, name: 'Bộ nhớ VRAM', unit: 'GB', displayOrder: 2 },
          ],
        },
      ],
    },
  })
  @ApiResponse({ status: 404, description: 'Danh mục không tồn tại' })
  findGroupsByCategory(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.findGroupsByCategory(id);
  }
}
