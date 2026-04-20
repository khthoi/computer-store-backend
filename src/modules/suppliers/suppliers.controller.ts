import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// Supplier data is admin-only; this stub satisfies module convention.
@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {}
