import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Transaction, TrangThaiGiaoDich, PhuongThucThanhToan } from './entities/transaction.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VNPayReturnDto } from './dto/vnpay-return.dto';
import { ZaloPayCallbackDto } from './dto/zalopay-callback.dto';
import { OrdersService } from '../orders/orders.service';
import { TrangThaiDon } from '../orders/entities/order.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { VNPayGateway } from './gateways/vnpay.gateway';
import { ZaloPayGateway } from './gateways/zalopay.gateway';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    private ordersService: OrdersService,
    private configService: ConfigService,
    private auditLogsService: AuditLogsService,
    private vnpayGateway: VNPayGateway,
    private zalopayGateway: ZaloPayGateway,
  ) {}

  async createTransaction(dto: CreatePaymentDto): Promise<{ transaction: Transaction; paymentUrl?: string }> {
    const order = await this.ordersService.findOne(dto.donHangId);

    const existing = await this.txRepo.findOne({ where: { donHangId: order.id } });
    if (existing && existing.trangThaiGiaoDich === TrangThaiGiaoDich.THANH_CONG) {
      throw new BadRequestException('Đơn hàng đã được thanh toán');
    }

    let tx: Transaction;
    if (existing) {
      const before = { trangThaiGiaoDich: existing.trangThaiGiaoDich, phuongThucThanhToan: existing.phuongThucThanhToan };
      existing.phuongThucThanhToan = dto.phuongThucThanhToan as PhuongThucThanhToan;
      existing.soTien = order.totalAmount;
      existing.nganHangVi = dto.nganHangVi ?? null;
      existing.trangThaiGiaoDich = TrangThaiGiaoDich.CHO;
      tx = await this.txRepo.save(existing);
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch đơn hàng #${order.orderCode}`,
        actionType: 'CapNhat',
        actionDetail: `Cập nhật giao dịch đơn hàng #${order.orderCode}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ trangThaiGiaoDich: tx.trangThaiGiaoDich, phuongThucThanhToan: tx.phuongThucThanhToan }),
      });
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
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch đơn hàng #${order.orderCode}`,
        actionType: 'TaoMoi',
        actionDetail: `Tạo giao dịch ${dto.phuongThucThanhToan} cho đơn hàng #${order.orderCode}`,
        after: JSON.stringify({ id: tx.id, phuongThucThanhToan: tx.phuongThucThanhToan, soTien: tx.soTien, trangThaiGiaoDich: tx.trangThaiGiaoDich }),
      });
    }

    if (dto.phuongThucThanhToan === PhuongThucThanhToan.COD) {
      return { transaction: tx };
    }

    if (dto.phuongThucThanhToan === PhuongThucThanhToan.VI_DIEN_TU && dto.nganHangVi === 'VNPay') {
      const paymentUrl = this.vnpayGateway.buildPaymentUrl({
        txnRef: String(tx.id),
        amount: Number(order.totalAmount),
        orderInfo: `Thanh toan don hang ${order.orderCode}`,
        ipAddr: '127.0.0.1',
        orderId: order.id,
      });
      return { transaction: tx, paymentUrl };
    }

    if (dto.phuongThucThanhToan === PhuongThucThanhToan.VI_DIEN_TU && dto.nganHangVi === 'ZaloPay') {
      const appTransId = this.zalopayGateway.buildAppTransId(tx.id);
      tx.maGiaoDichNgoai = appTransId;
      await this.txRepo.save(tx);

      const result = await this.zalopayGateway.createOrder({
        appTransId,
        userRef: `customer_${order.customerId ?? 'guest'}`,
        amount: Number(order.totalAmount),
        orderInfo: `Thanh toan don hang ${order.orderCode}`,
        orderId: order.id,
      });
      if (result.return_code !== 1 || !result.order_url) {
        tx.trangThaiGiaoDich = TrangThaiGiaoDich.THAT_BAI;
        tx.ghiChuLoi = `ZaloPay create order failed: ${result.return_message}`;
        await this.txRepo.save(tx);
        throw new BadRequestException(`Tạo đơn ZaloPay thất bại: ${result.return_message}`);
      }
      return { transaction: tx, paymentUrl: result.order_url };
    }

    return { transaction: tx };
  }

  async handleVNPayIpn(query: VNPayReturnDto): Promise<{ RspCode: string; Message: string }> {
    const raw = query as unknown as Record<string, string>;

    if (!this.vnpayGateway.verifySignature(raw)) {
      return { RspCode: '97', Message: 'Invalid signature' };
    }

    const txnRef = query.vnp_TxnRef;
    if (!txnRef) return { RspCode: '01', Message: 'Order not found' };

    const tx = await this.txRepo.findOne({ where: { id: parseInt(txnRef) } });
    if (!tx) return { RspCode: '01', Message: 'Order not found' };

    if (Math.round(Number(tx.soTien) * 100) !== Number(query.vnp_Amount)) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (
      tx.trangThaiGiaoDich === TrangThaiGiaoDich.THANH_CONG ||
      tx.trangThaiGiaoDich === TrangThaiGiaoDich.THAT_BAI
    ) {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const before = { trangThaiGiaoDich: tx.trangThaiGiaoDich };
    const success = this.vnpayGateway.isSuccess(raw);

    if (success) {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
      tx.maGiaoDichNgoai = query.vnp_TransactionNo ?? null;
      tx.nganHangVi = query.vnp_BankCode ?? tx.nganHangVi;
      tx.thoiDiemThanhToan = new Date();
      await this.txRepo.save(tx);

      const orderDto = await this.ordersService.updateStatus(
        tx.donHangId,
        { trangThai: TrangThaiDon.DA_XAC_NHAN, ghiChu: 'Thanh toán VNPay thành công (IPN)' },
        0,
      );
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch #${tx.id}`,
        actionType: 'CapNhat',
        actionDetail: `IPN VNPay xác nhận thanh toán thành công đơn hàng #${orderDto.orderCode}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THANH_CONG, maGiaoDichNgoai: tx.maGiaoDichNgoai }),
      });
    } else {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THAT_BAI;
      tx.ghiChuLoi = `VNPay ResponseCode: ${query.vnp_ResponseCode}`;
      await this.txRepo.save(tx);
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch #${tx.id}`,
        actionType: 'CapNhat',
        actionDetail: `IPN VNPay xác nhận thanh toán thất bại: ${query.vnp_ResponseCode}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THAT_BAI }),
      });
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async handleZaloPayCallback(body: ZaloPayCallbackDto): Promise<{ return_code: number; return_message: string }> {
    const verify = this.zalopayGateway.verifyCallback(body);
    if (!verify.valid || !verify.data) {
      return { return_code: -1, return_message: 'mac not equal' };
    }

    const { app_trans_id, amount, zp_trans_id } = verify.data;
    const tx = await this.txRepo.findOne({ where: { maGiaoDichNgoai: app_trans_id } });
    if (!tx) return { return_code: 0, return_message: 'transaction not found' };

    if (Math.round(Number(tx.soTien)) !== Number(amount)) {
      return { return_code: 0, return_message: 'amount mismatch' };
    }

    if (tx.trangThaiGiaoDich === TrangThaiGiaoDich.THANH_CONG) {
      return { return_code: 1, return_message: 'success' };
    }

    const before = { trangThaiGiaoDich: tx.trangThaiGiaoDich };
    tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
    tx.maGiaoDichNgoai = String(zp_trans_id);
    tx.thoiDiemThanhToan = new Date();
    await this.txRepo.save(tx);

    const orderDto = await this.ordersService.updateStatus(
      tx.donHangId,
      { trangThai: TrangThaiDon.DA_XAC_NHAN, ghiChu: 'Thanh toán ZaloPay thành công (callback)' },
      0,
    );
    this.auditLogsService.log({
      entityType: 'GiaoDich',
      entityId: String(tx.id),
      entityLabel: `Giao dịch #${tx.id}`,
      actionType: 'CapNhat',
      actionDetail: `Callback ZaloPay xác nhận thanh toán đơn hàng #${orderDto.orderCode}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THANH_CONG, maGiaoDichNgoai: tx.maGiaoDichNgoai }),
    });

    return { return_code: 1, return_message: 'success' };
  }

  async handleVNPayReturn(query: VNPayReturnDto): Promise<{ success: boolean; message: string }> {
    const raw = query as unknown as Record<string, string>;
    const isValid = this.vnpayGateway.verifySignature(raw);
    const success = isValid && this.vnpayGateway.isSuccess(raw);

    const txnRef = query.vnp_TxnRef;
    if (!txnRef) return { success: false, message: 'Thiếu mã giao dịch' };

    const tx = await this.txRepo.findOne({ where: { id: parseInt(txnRef) } });
    if (!tx) return { success: false, message: 'Giao dịch không tồn tại' };

    const before = { trangThaiGiaoDich: tx.trangThaiGiaoDich };

    if (success) {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
      tx.maGiaoDichNgoai = query.vnp_TransactionNo ?? null;
      tx.nganHangVi = query.vnp_BankCode ?? tx.nganHangVi;
      tx.thoiDiemThanhToan = new Date();
      await this.txRepo.save(tx);

      // Cập nhật trạng thái đơn hàng
      const orderDto = await this.ordersService.updateStatus(
        tx.donHangId,
        { trangThai: TrangThaiDon.DA_XAC_NHAN, ghiChu: 'Thanh toán VNPay thành công' },
        0,
      );
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch #${tx.id}`,
        actionType: 'CapNhat',
        actionDetail: `Thanh toán VNPay thành công đơn hàng #${orderDto.orderCode}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THANH_CONG, maGiaoDichNgoai: tx.maGiaoDichNgoai }),
      });
    } else {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THAT_BAI;
      tx.ghiChuLoi = `VNPay ResponseCode: ${query.vnp_ResponseCode}`;
      await this.txRepo.save(tx);
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch #${tx.id}`,
        actionType: 'CapNhat',
        actionDetail: `Thanh toán VNPay thất bại: ResponseCode ${query.vnp_ResponseCode}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THAT_BAI }),
      });
    }

    return { success, message: success ? 'Thanh toán thành công' : 'Thanh toán thất bại' };
  }

  async handleMoMoCallback(body: any): Promise<{ success: boolean }> {
    const success = body?.resultCode === 0;
    const orderId = body?.orderId as string | undefined;
    if (!orderId) return { success: false };

    const tx = await this.txRepo.findOne({ where: { id: parseInt(orderId) } });
    if (!tx) return { success: false };

    const before = { trangThaiGiaoDich: tx.trangThaiGiaoDich };

    if (success) {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
      tx.maGiaoDichNgoai = body.transId?.toString() ?? null;
      tx.thoiDiemThanhToan = new Date();
      await this.txRepo.save(tx);

      const orderDto = await this.ordersService.updateStatus(
        tx.donHangId,
        { trangThai: TrangThaiDon.DA_XAC_NHAN, ghiChu: 'Thanh toán MoMo thành công' },
        0,
      );
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch #${tx.id}`,
        actionType: 'CapNhat',
        actionDetail: `Thanh toán MoMo thành công đơn hàng #${orderDto.orderCode}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THANH_CONG, maGiaoDichNgoai: tx.maGiaoDichNgoai }),
      });
    } else {
      tx.trangThaiGiaoDich = TrangThaiGiaoDich.THAT_BAI;
      tx.ghiChuLoi = `MoMo resultCode: ${body?.resultCode}`;
      await this.txRepo.save(tx);
      this.auditLogsService.log({
        entityType: 'GiaoDich',
        entityId: String(tx.id),
        entityLabel: `Giao dịch #${tx.id}`,
        actionType: 'CapNhat',
        actionDetail: `Thanh toán MoMo thất bại: resultCode ${body?.resultCode}`,
        before: JSON.stringify(before),
        after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THAT_BAI }),
      });
    }

    return { success };
  }

  async confirmCOD(donHangId: number, adminId: number): Promise<Transaction> {
    const tx = await this.txRepo.findOne({ where: { donHangId } });
    if (!tx) throw new NotFoundException('Giao dịch không tồn tại');
    if (tx.phuongThucThanhToan !== PhuongThucThanhToan.COD) {
      throw new BadRequestException('Đây không phải đơn hàng COD');
    }

    const before = { trangThaiGiaoDich: tx.trangThaiGiaoDich };
    tx.trangThaiGiaoDich = TrangThaiGiaoDich.THANH_CONG;
    tx.thoiDiemThanhToan = new Date();
    await this.txRepo.save(tx);

    const orderDto = await this.ordersService.updateStatus(
      donHangId,
      { trangThai: TrangThaiDon.DA_GIAO, ghiChu: 'Xác nhận giao COD thành công' },
      adminId,
    );
    this.auditLogsService.log({
      entityType: 'GiaoDich',
      entityId: String(tx.id),
      entityLabel: `Giao dịch COD đơn hàng #${orderDto.orderCode}`,
      actionType: 'CapNhat',
      actionDetail: `Xác nhận thanh toán COD đơn hàng #${orderDto.orderCode}`,
      before: JSON.stringify(before),
      after: JSON.stringify({ trangThaiGiaoDich: TrangThaiGiaoDich.THANH_CONG }),
    });

    return tx;
  }

  async getTransactionByOrder(donHangId: number): Promise<Transaction> {
    const tx = await this.txRepo.findOne({ where: { donHangId } });
    if (!tx) throw new NotFoundException('Giao dịch không tồn tại');
    return tx;
  }

}
