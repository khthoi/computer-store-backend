import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface BuildVNPayUrlInput {
  txnRef: string;
  amount: number;
  orderInfo: string;
  ipAddr: string;
  bankCode?: string;
  locale?: 'vn' | 'en';
  orderId?: number;
}

export interface VNPayIpnResult {
  RspCode: string;
  Message: string;
}

@Injectable()
export class VNPayGateway {
  private readonly logger = new Logger(VNPayGateway.name);

  constructor(private configService: ConfigService) {}

  buildPaymentUrl(input: BuildVNPayUrlInput): string {
    const tmnCode = this.requireConfig('VNP_TMN_CODE');
    const secret = this.requireConfig('VNP_HASH_SECRET');
    const payUrl = this.configService.get<string>(
      'VNP_PAY_URL',
      'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    );
    const baseReturnUrl = this.requireConfig('VNP_RETURN_URL');
    const returnUrl = input.orderId
      ? `${baseReturnUrl}${baseReturnUrl.includes('?') ? '&' : '?'}orderId=${input.orderId}`
      : baseReturnUrl;

    const now = this.toVnTime(new Date());
    const expire = this.toVnTime(new Date(Date.now() + 15 * 60 * 1000));

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(Math.round(input.amount * 100)),
      vnp_CreateDate: now,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: input.ipAddr || '127.0.0.1',
      vnp_Locale: input.locale ?? 'vn',
      vnp_OrderInfo: input.orderInfo,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: input.txnRef,
      vnp_ExpireDate: expire,
    };
    if (input.bankCode) params.vnp_BankCode = input.bankCode;

    const sorted = this.sortObject(params);
    const signData = this.buildQueryString(sorted);
    const secureHash = crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return `${payUrl}?${signData}&vnp_SecureHash=${secureHash}`;
  }

  verifySignature(query: Record<string, string>): boolean {
    const secret = this.requireConfig('VNP_HASH_SECRET');
    const secureHash = query.vnp_SecureHash;
    if (!secureHash) return false;

    const filtered: Record<string, string> = {};
    for (const [k, v] of Object.entries(query)) {
      if (k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') {
        filtered[k] = String(v);
      }
    }

    const sorted = this.sortObject(filtered);
    const signData = this.buildQueryString(sorted);
    const expected = crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(signData, 'utf-8'))
      .digest('hex');

    return expected === secureHash;
  }

  isSuccess(query: Record<string, string>): boolean {
    return query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00';
  }

  private toVnTime(date: Date): string {
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      vn.getUTCFullYear().toString() +
      pad(vn.getUTCMonth() + 1) +
      pad(vn.getUTCDate()) +
      pad(vn.getUTCHours()) +
      pad(vn.getUTCMinutes()) +
      pad(vn.getUTCSeconds())
    );
  }

  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
    return sorted;
  }

  private buildQueryString(obj: Record<string, string>): string {
    return Object.entries(obj)
      .map(([k, v]) => `${this.encode(k)}=${this.encode(v)}`)
      .join('&');
  }

  private encode(value: string): string {
    return encodeURIComponent(value).replace(/%20/g, '+');
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      this.logger.error(`Thiếu biến môi trường: ${key}`);
      throw new Error(`Cấu hình VNPay không đầy đủ: ${key}`);
    }
    return value;
  }
}
