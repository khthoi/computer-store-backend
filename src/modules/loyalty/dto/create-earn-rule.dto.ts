import {
  IsString, IsOptional, IsInt, IsNumber, IsBoolean, IsDate, IsEnum, IsArray, ValidateNested, Min, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEarnRuleScopeDto {
  @ApiProperty({ enum: ['category', 'brand', 'product'], example: 'category' })
  @IsEnum(['category', 'brand', 'product'])
  scopeType: 'category' | 'brand' | 'product';

  @ApiProperty({ example: '3' })
  @IsString()
  scopeRefId: string;

  @ApiProperty({ example: 'Laptop' })
  @IsString()
  scopeRefLabel: string;

  @ApiProperty({ example: 2.0, description: 'Hệ số nhân điểm (2.0 = gấp đôi)' })
  @IsNumber()
  multiplier: number;
}

export class CreateEarnRuleDto {
  @ApiProperty({ example: 'Tích điểm cơ bản' })
  @IsString() @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Cứ 10.000đ chi tiêu = 1 điểm' })
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 1, description: 'Số điểm tích mỗi đơn vị chi tiêu' })
  @IsInt() @Min(1)
  pointsPerUnit: number;

  @ApiProperty({ example: 10000, description: 'Số tiền (VND) tương ứng 1 đơn vị' })
  @IsNumber()
  spendPerUnit: number;

  @ApiPropertyOptional({ example: 100000, description: 'Giá trị đơn tối thiểu để tích điểm' })
  @IsOptional() @IsNumber()
  minOrderValue?: number;

  @ApiPropertyOptional({ example: 500, description: 'Trần điểm tối đa mỗi đơn' })
  @IsOptional() @IsInt()
  maxPointsPerOrder?: number;

  @ApiPropertyOptional({ enum: ['first_order', 'birthday', 'manual'], example: 'first_order' })
  @IsOptional() @IsEnum(['first_order', 'birthday', 'manual'])
  bonusTrigger?: 'first_order' | 'birthday' | 'manual';

  @ApiPropertyOptional({ example: 100, description: 'Điểm bonus khi sự kiện kích hoạt' })
  @IsOptional() @IsInt()
  bonusPoints?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Ưu tiên cao hơn = xét trước' })
  @IsOptional() @IsInt() @Min(0)
  priority?: number;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z' })
  @IsOptional() @Type(() => Date) @IsDate()
  validFrom?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional() @Type(() => Date) @IsDate()
  validUntil?: Date;

  @ApiPropertyOptional({ type: [CreateEarnRuleScopeDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => CreateEarnRuleScopeDto)
  scopes?: CreateEarnRuleScopeDto[];
}
