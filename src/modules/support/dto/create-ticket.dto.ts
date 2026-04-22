import {
  IsString, IsEnum, IsOptional, IsInt, IsArray, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiPropertyOptional({ example: 20, description: 'ID đơn hàng liên quan (nếu có)' })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiProperty({ example: 'GiaoHangChamTre', description: 'Loại vấn đề' })
  @IsString()
  @MaxLength(30)
  issueType: string;

  @ApiPropertyOptional({ enum: ['Cao', 'TrungBinh', 'Thap'], default: 'TrungBinh' })
  @IsOptional()
  @IsEnum(['Cao', 'TrungBinh', 'Thap'])
  priority?: 'Cao' | 'TrungBinh' | 'Thap' = 'TrungBinh';

  @ApiProperty({ example: 'Đơn hàng #20 giao trễ hơn 5 ngày' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiProperty({ example: 'Tôi đặt hàng ngày 01/06, dự kiến giao 03/06 nhưng đến nay chưa nhận được...' })
  @IsString()
  @MinLength(10)
  description: string;

  @ApiProperty({ enum: ['Chat', 'Email', 'DienThoai', 'Form'], example: 'Form' })
  @IsEnum(['Chat', 'Email', 'DienThoai', 'Form'])
  channel: 'Chat' | 'Email' | 'DienThoai' | 'Form';

  @ApiPropertyOptional({ type: [String], example: ['giao hàng', 'chậm trễ'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
