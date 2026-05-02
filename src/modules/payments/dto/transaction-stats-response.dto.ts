import { ApiProperty } from '@nestjs/swagger';

export class TransactionStatsResponseDto {
  @ApiProperty({ description: 'Tổng số giao dịch' }) tongGiaoDich: number;
  @ApiProperty({ description: 'Tổng tiền giao dịch thành công' }) tongTien: number;
  @ApiProperty({ description: 'Số giao dịch thành công' }) soThanhCong: number;
  @ApiProperty({ description: 'Số giao dịch thất bại' }) soThatBai: number;
  @ApiProperty({ description: 'Số giao dịch đang chờ' }) soDangCho: number;
  @ApiProperty({ description: 'Số giao dịch đã hoàn' }) soDaHoan: number;
  @ApiProperty({ description: 'Tỷ lệ thành công 0–100, 1 chữ số thập phân' }) tyLeThanhCong: number;
}
