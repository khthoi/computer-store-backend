import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() address?: string;
  @ApiPropertyOptional() contactName?: string;
  @ApiProperty({ enum: ['active', 'inactive'] }) status: string;
  @ApiProperty() leadTimeDays: number;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() productCount: number;
  @ApiProperty() totalOrders: number;
  @ApiProperty() createdAt: string;
  @ApiProperty() updatedAt: string;
}

export class PaginatedSuppliersDto {
  @ApiProperty({ type: [SupplierResponseDto] }) data: SupplierResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
