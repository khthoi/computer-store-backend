import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ReorderHomepageSectionsDto {
  @ApiProperty({ type: [Number], example: [3, 1, 2], description: 'Section IDs in desired order (index = new sortOrder)' })
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  ids: number[];
}
