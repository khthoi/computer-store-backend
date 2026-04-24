import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Transaction, TrangThaiGiaoDich, PhuongThucThanhToan } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VNPayReturnDto } from './dto/vnpay-return.dto';
import { OrdersService } from '../orders/orders.service';
import { TrangThaiDon } from '../orders/entities/order.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    private ordersService: OrdersService,
    private configService: ConfigService,
  ) {}

  async createTransaction(dto: CreatePaymentDto): Promise<{ transaction: Transaction; paymentUrl?: string }> {
    const order = await this.ordersService.findOne(dto.donHangId);

    const existing = await this.txRepo.findOne({ where: { donHangId: order.id } });
    if (existing && existing.trangThaiGiaoDich === TrangThaiGiaoDich.THANH_CONG) {
      throw new BadRequestException('Đơn hàng đã được thanh toán');
    }

    let tx: Transaction;
    if (existing) {
      existing.phuongThucThanhToan = dto.phuongThucThanhToan as PhuongThucThanhToan;
      existing.soTien = order.totalAmount;
      existing.nganHangVi = dto.nganHangVi ?? null;
      existing.trangThaiGiaoDich = TrangThaiGiaoDich.CHO;
      tx = await this.txRepo.save(existing);
    } else {
      tx = await this.txRepo.save(
        this.txRepo.create({
          donHangId: order.id,
          phuongThucThanhToan: dto.phuongThucThanhToan as PhuongThucThanhToan,
          soTien: order.totalAmount,
          nganHangVi: dto.nganHangVi ?? null,
          trangThaiGiaoDich: TrangThaiGiaoDich.CHO,
        }),
      );
    }

    if (dto.phuongThucThanhToan === PhuongThucThanhToan.COD) {
      return { transaction: tx };
    }

    if (dto.phuongThucThanhToan === PhuongThucThanhToan.VI_DIEN_TU && dto.nganHangVi === 'VNPay') {
      const paymentUrl = this.buildVNPayUrl(tx, order.totalAmount, order.orderCode);
      return { transaction: tx, paymentUrl };
    }

    return { transaction: tx };
  }

  async handleVNPayReturn(query: VNPayReturnDto): Promise<{ success: boolean; message: string }> {
    const secretKey = this.configService.get<string>('VNPAY_SECRET_KEY', '');
    const { vnp_SecureHash, ...params } = query as any;

    const isValid = vnp_SecureHash ? this.verifyVNPaySignature(params, vnp_SecureHash, secretKey) : false;
    const success = isValid && query.vnp_ResponseCode === '00';

    const txnRef = query.vnp_TxnRef;
    if (!txnRef) return { success: false, message: 'Thiếu mã giao dịch' };

    const tx = await this.txRepo.findOne({ where: { id: parseInt(txnRef) } });
    if (!tx) return { success: false, message: 'Giao dịch không tồn tại' };

    if (success) {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
      tx.maGiaoDichNgoai = query.vnp_TransactionNo ?? null;
      tx.nganHangVi = query.vnp_BankCode ?? tx.nganHangVi;
      tx.thoiDiemThanhToan = new Date();
      await this.txRepo.save(tx);

      // Cập nhật trạng thái đơn hàng
      await this.ordersService.updateStatus(
        tx.donHangId,
        { trangThai: TrangThaiDon.DA_XAC_NHAN, ghiChu: 'Thanh toán VNPay thành công' },
        0,
      );
    } else {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THAT_BAI;
      tx.ghiChuLoi = `VNPay ResponseCode: ${query.vnp_ResponseCode}`;
      await this.txRepo.save(tx);
    }

    return { success, message: success ? 'Thanh toán thành công' : 'Thanh toán thất bại' };
  }

  async handleMoMoCallback(body: any): Promise<{ success: boolean }> {
    const success = body?.resultCode === 0;
    const orderId = body?.orderId as string | undefined;
    if (!orderId) return { success: false };

    const tx = await this.txRepo.findOne({ where: { id: parseInt(orderId) } });
    if (!tx) return { success: false };

    if (success) {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
      tx.maGiaoDichNgoai = body.transId?.toString() ?? null;
      tx.thoiDiemThanhToan = new Date();
      await this.txRepo.save(tx);

      await this.ordersService.updateStatus(
        tx.donHangId,
        { trangThai: TrangThaiDon.DA_XAC_NHAN, ghiChu: 'Thanh toán MoMo thành công' },
        0,
      );
    } else {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THAT_BAI;
      tx.ghiChuLoi = `MoMo resultCode: ${body?.resultCode}`;
      await this.txRepo.save(tx);
    }

    return { success };
  }

  async confirmCOD(donHangId: number, adminId: number): Promise<Transaction> {
    const tx = await this.txRepo.findOne({ where: { donHangId } });
    if (!tx) throw new NotFoundException('Giao dịch không tồn tại');
    if (tx.phuongThucThanhToan !== PhuongThucThanhToan.COD) {
      throw new BadRequestException('Đây không phải đơn hàng COD');
    }

    tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
    tx.thoiDiemThanhToan = new Date();
    await this.txRepo.save(tx);

    await this.ordersService.updateStatus(
      donHangId,
      { trangThai: TrangThaiDon.DA_GIAO, ghiChu: 'Xác nhận giao COD thành công' },
      adminId,
    );

    return tx;
  }

  async getTransactionByOrder(donHangId: number): Promise<Transaction> {
    const tx = await this.txRepo.findOne({ where: { donHangId } });
    if (!tx) throw new NotFoundException('Giao dịch không tồn tại');
    return tx;
  }

  private buildVNPayUrl(tx: Transaction, amount: number, orderCode: string): string {
    const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE', 'TEST_TMN');
    const secretKey = this.configService.get<string>('VNPAY_SECRET_KEY', '');
    const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL', 'http://localhost:4000/payments/vnpay/return');

    const now = new Date();
    const createDate = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const expireDate = new Date(now.getTime() + 15 * 60 * 1000)
      .toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(Math.round(amount * 100)),
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: '127.0.0.1',
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Thanh toan don hang ${orderCode}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: String(tx.id),
      vnp_ExpireDate: expireDate,
    };

    const sortedKeys = Object.keys(params).sort();
    const signData = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
    const hmac = crypto.createHmac('sha512', secretKey).update(signData).digest('hex');

    const query = sortedKeys.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
    return `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${query}&vnp_SecureHash=${hmac}`;
  }

  private verifyVNPaySignature(params: Record<string, string>, hash: string, secretKey: string): boolean {
    const sortedKeys = Object.keys(params)
      .filter((k) => k.startsWith('vnp_') && k !== 'vnp_SecureHash')
      .sort();
    const signData = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
    const expected = crypto.createHmac('sha512', secretKey).update(signData).digest('hex');
    return expected === hash;
  }
}
