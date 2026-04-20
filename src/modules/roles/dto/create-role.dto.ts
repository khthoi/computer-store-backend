import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'warehouse_manager', description: 'Tên vai trò (unique)' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  tenVaiTro: string;

  @ApiPropertyOptional({ example: 'Quản lý kho hàng' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  moTa?: string;
}
