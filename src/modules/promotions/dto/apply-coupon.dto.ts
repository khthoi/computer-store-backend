import { IsString, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({ example: 12 })
  @IsInt() @Min(1)
  variantId: number;

  @ApiProperty({ example: 2 })
  @IsInt() @Min(1)
  quantity: number;

  @ApiProperty({ example: 15000000 })
  @IsInt() @Min(0)
  price: number;
}

export class ApplyCouponDto {
  @ApiProperty({ example: 'SUMMER10' })
  @IsString()
  code: string;

  @ApiProperty({ type: [CartItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => CartItemDto)
  items: CartItemDto[];

  @ApiProperty({ example: 30000000 })
  @IsInt() @Min(0)
  subtotal: number;
}
