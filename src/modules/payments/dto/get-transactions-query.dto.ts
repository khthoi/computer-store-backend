import { IsOptional, IsInt, Min, IsString, IsDateString, IsEnum, IsIn, MaxLength } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TrangThaiGiaoDich, PhuongThucThanhToan } from '../entities/transaction.entity';

export class GetTransactionsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: TrangThaiGiaoDich, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
  @IsEnum(TrangThaiGiaoDich, { each: true })
  trangThai?: TrangThaiGiaoDich[];

  @ApiPropertyOptional({ enum: PhuongThucThanhToan, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]))
  @IsEnum(PhuongThucThanhToan, { each: true })
  phuongThuc?: PhuongThucThanhToan[];

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Lọc từ ngày (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  tuNgay?: string;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Lọc đến ngày (YYYY-MM-DD, inclusive)' })
  @IsOptional()
  @IsDateString()
  denNgay?: string;

  @ApiPropertyOptional({ description: 'Tìm theo mã đơn hàng, mã GD ngoài, tên khách hàng' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    description: 'Cột sort: ngayTao | soTien | tenKhachHang | thoiDiemThanhToan',
    default: 'ngayTao',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'ngayTao';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC', 'asc', 'desc'])
  sortOrder?: string = 'DESC';
}
