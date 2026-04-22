import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AssignTicketDto {
  @ApiProperty({ example: 3, description: 'ID nhân viên phụ trách' })
  @IsInt()
  employeeId: number;
}
