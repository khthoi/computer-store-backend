import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AddOrderNoteDto {
  @ApiProperty({ example: 'Khách yêu cầu gói hàng cẩn thận' })
  @IsString()
  @MinLength(1)
  text: string;

  @ApiProperty({ example: 'Nguyễn Văn Admin' })
  @IsString()
  authorName: string;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  authorRole: string;
}
