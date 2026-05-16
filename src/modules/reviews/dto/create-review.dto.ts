import { IsInt, IsString, IsOptional, Min, Max, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  variantId: number;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  orderId: number;

  @ApiProperty({ example: 5, description: 'Đánh giá từ 1 đến 5 sao' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Sản phẩm tốt, giao hàng nhanh' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 'Mình rất hài lòng với sản phẩm này...' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;
}
