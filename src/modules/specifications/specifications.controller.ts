import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SpecificationsService } from './specifications.service';

@ApiTags('Specifications')
@Public()
@Controller('specs')
export class SpecificationsController {
  constructor(private readonly specsService: SpecificationsService) {}

  @Get('groups')
  @ApiOperation({ summary: 'Tất cả nhóm thông số (kèm loại)' })
  findAllGroups() {
    return this.specsService.findAllGroups();
  }

  @Get('types')
  @ApiOperation({ summary: 'Tất cả loại thông số' })
  findAllTypes() {
    return this.specsService.findAllTypes();
  }

  @Get('categories/:id/groups')
  @ApiOperation({ summary: 'Nhóm thông số theo danh mục' })
  findGroupsByCategory(@Param('id', ParseIntPipe) id: number) {
    return this.specsService.findGroupsByCategory(id);
  }
}
