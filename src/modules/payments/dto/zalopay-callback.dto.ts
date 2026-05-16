import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString } from 'class-validator';

export class ZaloPayCallbackDto {
  @ApiProperty({ description: 'Chuỗi JSON dữ liệu giao dịch' })
  @IsString()
  data: string;

  @ApiProperty({ description: 'Chữ ký HMAC-SHA256 của data, ký bằng key2' })
  @IsString()
  mac: string;

  @ApiProperty({ description: 'Loại callback (1 = wallet, 2 = gateway)' })
  @IsInt()
  type: number;
}
