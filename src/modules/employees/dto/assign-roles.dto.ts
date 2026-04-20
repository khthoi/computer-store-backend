import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsInt } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ type: [Number], example: [1, 2], description: 'Danh sách role ID' })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  roleIds: number[];
}
