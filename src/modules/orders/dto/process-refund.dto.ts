import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class RefundItemDto {
  @IsString() productId: string;
  @IsString() variantId: string;
  @IsNumber() @Min(1) quantity: number;
}

export class ProcessRefundDto {
  @ApiProperty({ enum: ['original', 'store_credit'], example: 'original' })
  @IsIn(['original', 'store_credit'])
  method: 'original' | 'store_credit';

  @ApiProperty({ example: 1500000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ type: [RefundItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RefundItemDto)
  items: RefundItemDto[];

  @ApiProperty({ example: 'Nguyễn Văn Admin' })
  @IsString()
  processedBy: string;

  @ApiPropertyOptional({ example: 'Sản phẩm lỗi, khách yêu cầu hoàn tiền' })
  @IsOptional()
  @IsString()
  lyDo?: string;

  @ApiProperty({ example: 3, description: 'ID yêu cầu đổi trả của khách hàng làm cơ sở cho lần hoàn tiền này' })
  @IsInt()
  @Min(1)
  yeuCauDoiTraId: number;
}
