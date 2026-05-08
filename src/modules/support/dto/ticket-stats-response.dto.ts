import { ApiProperty } from '@nestjs/swagger';

export class TicketStatsResponseDto {
  @ApiProperty({ description: 'Tổng số ticket trong hệ thống' }) tongSoTicket: number;
  @ApiProperty({ description: 'Ticket đang mở (Moi + DangXuLy + ChoDongY)' }) dangMo: number;
  @ApiProperty({ description: 'Ticket mới, chưa có nhân viên nhận' }) chuaXuLy: number;
  @ApiProperty({ description: 'Ticket độ ưu tiên Cao chưa đóng (proxy cho KhanCap)' }) khanCap: number;
  @ApiProperty({ description: 'Ticket đã vượt SLA deadline' }) slaBreached: number;
  @ApiProperty({ description: 'Trung bình giờ xử lý (tính trên ticket đã đóng)' }) trungBinhGiaiQuyet: number;
}
