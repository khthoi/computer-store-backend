import { IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiProperty({ example: 3, description: 'ID nhân viên phụ trách; null để huỷ phân công', nullable: true })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  employeeId: number | null;
}
