import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessRefundResolutionDto {
  @ApiProperty({ example: 1500000, description: 'Số tiền hoàn trả' })
  @IsNumber()
  @IsPositive()
  soTienHoan: number;

  @ApiProperty({ example: 'ChuyenKhoan', description: 'Phương thức hoàn tiền' })
  @IsString()
  @MaxLength(30)
  phuongThucHoan: string;

  @ApiPropertyOptional({ example: 5, description: 'ID phiếu nhập kho hàng trả về' })
  @IsOptional()
  @IsNumber()
  phieuNhapKhoId?: number;

  @ApiPropertyOptional({ example: 'TXN-20240601-ABC', description: 'Mã giao dịch hoàn tiền' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  maGiaoDichHoan?: string;

  @ApiPropertyOptional({ example: 'Vietcombank', description: 'Ngân hàng/ví điện tử hoàn tiền' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nganHangViHoan?: string;

  @ApiPropertyOptional({ example: 'Hàng nguyên vẹn, đủ phụ kiện' })
  @IsOptional()
  @IsString()
  ghiChu?: string;
}

export class ProcessExchangeResolutionDto {
  @ApiPropertyOptional({ example: 3, description: 'ID phiếu nhập kho hàng trả về' })
  @IsOptional()
  @IsNumber()
  phieuNhapKhoId?: number;

  @ApiPropertyOptional({ example: 'GHN-20240601-XYZ', description: 'Mã vận đơn đơn hàng thay thế' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  trackingDoiHang?: string;

  @ApiPropertyOptional({ example: 'GHN', description: 'Đơn vị vận chuyển' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrierDoiHang?: string;

  @ApiPropertyOptional({ example: 'Đổi đúng model theo yêu cầu' })
  @IsOptional()
  @IsString()
  ghiChu?: string;
}

export class ProcessWarrantyReturnDto {
  @ApiProperty({ example: 'GHN-BH-20240601-001', description: 'Mã vận đơn gửi lại cho khách' })
  @IsString()
  @MaxLength(200)
  trackingTraKhach: string;

  @ApiPropertyOptional({ example: 'Đã thay thế chip, kiểm tra pass' })
  @IsOptional()
  @IsString()
  ghiChu?: string;
}

export class UpdateWarrantyStatusDto {
  @ApiPropertyOptional({ example: 'SAP-WARRANTY-12345', description: 'Mã ticket bảo hành từ hãng' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  maBaoHanhHang?: string;

  @ApiPropertyOptional({ example: '2024-06-10', description: 'Ngày gửi hàng về hãng' })
  @IsOptional()
  @IsString()
  ngayGuiHangBaoHanh?: string;

  @ApiPropertyOptional({ example: '2024-06-20', description: 'Ngày nhận hàng về từ hãng' })
  @IsOptional()
  @IsString()
  ngayNhanHangVe?: string;

  @ApiPropertyOptional({ example: 'Đã thay RAM mới, pass test' })
  @IsOptional()
  @IsString()
  ketQuaBaoHanh?: string;

  @ApiPropertyOptional({ enum: ['NguyenVen', 'HuHong', 'ThieuPhuKien'] })
  @IsOptional()
  @IsEnum(['NguyenVen', 'HuHong', 'ThieuPhuKien'])
  tinhTrangHangNhan?: 'NguyenVen' | 'HuHong' | 'ThieuPhuKien';
}
