import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ContactMessagesService } from './contact-messages.service';
import { QueryContactMessagesDto } from './dto/query-contact-messages.dto';
import { UpdateContactMessageDto } from './dto/update-contact-message.dto';

@ApiTags('Admin — Contact Messages')
@ApiBearerAuth()
@Roles('admin', 'cskh', 'staff')
@Controller('admin/contact-messages')
export class AdminContactMessagesController {
  constructor(private readonly service: ContactMessagesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Thống kê liên hệ' })
  getStats() {
    return this.service.adminStats();
  }

  @Get()
  @ApiOperation({ summary: 'Danh sách liên hệ' })
  list(@Query() query: QueryContactMessagesDto) {
    return this.service.adminList(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết liên hệ' })
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminGet(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật trạng thái / ghi chú' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactMessageDto,
    @Request() req: any,
  ) {
    return this.service.adminUpdate(id, dto, req.user?.sub);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Xoá liên hệ' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminDelete(id);
  }
}
