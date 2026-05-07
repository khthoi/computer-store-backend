import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderPagesDto {
  @ApiProperty({ type: [String], description: 'IDs trang theo thứ tự mới (index → sortOrder)' })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
