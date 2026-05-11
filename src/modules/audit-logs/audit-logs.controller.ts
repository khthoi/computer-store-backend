import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermission('audit-logs.read')
  @ApiOperation({ summary: 'Lấy danh sách audit log hệ thống' })
  getAll(@Query() query: AuditLogQueryDto) {
    return this.auditLogsService.findAll(query);
  }

  @Get('export')
  @RequirePermission('audit-logs.export')
  @ApiOperation({ summary: 'Xuất audit log ra CSV' })
  async exportCsv(@Query() query: AuditLogQueryDto, @Res() res: Response) {
    const csv = await this.auditLogsService.exportCsv(query);
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv);
  }
}
