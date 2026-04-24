import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// No public-facing report endpoints — all reports are admin-only
@ApiTags('Admin — Reports')
@Controller()
export class ReportsController {}
