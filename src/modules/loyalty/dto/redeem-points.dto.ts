import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemPointsDto {
  @ApiProperty({ example: 1, description: 'ID phần thưởng trong catalog' })
  @IsInt() @Min(1)
  catalogId: number;
}
