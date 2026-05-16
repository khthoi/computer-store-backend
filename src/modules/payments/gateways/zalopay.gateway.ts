import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface CreateZaloPayOrderInput {
  appTransId: string;
  userRef: string;
  amount: number;
  orderInfo: string;
  itemDescription?: Array<{ itemid: string; itemname: string; itemprice: number; itemquantity: number }>;
  bankCode?: string;
  orderId?: number;
}

export interface ZaloPayCreateOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message?: string;
  zp_trans_token?: string;
  order_url?: string;
  order_token?: string;
}

export interface ZaloPayCallbackBody {
  data: string;
  mac: string;
  type: number;
}

export interface ZaloPayCallbackData {
  app_id: number;
  app_trans_id: string;
  app_time: number;
  app_user: string;
  amount: number;
  embed_data: string;
  item: string;
  zp_trans_id: number;
  server_time: number;
  channel: number;
  merchant_user_id: string;
  user_fee_amount: number;
  discount_amount: number;
}

@Injectable()
export class ZaloPayGateway {
  private readonly logger = new Logger(ZaloPayGateway.name);

  constructor(private configService: ConfigService) {}

  async createOrder(input: CreateZaloPayOrderInput): Promise<ZaloPayCreateOrderResponse> {
    const appId = Number(this.requireConfig('ZALO_APP_ID'));
    const key1 = this.requireConfig('ZALO_KEY1');
    const endpoint = this.configService.get<string>(
      'ZALO_CREATE_ORDER_URL',
      'https://sb-openapi.zalopay.vn/v2/create',
    );
    const callbackUrl = this.configService.get<string>('ZALO_CALLBACK_URL', '');
    const baseRedirectUrl = this.configService.get<string>('ZALO_REDIRECT_URL', '');
    const redirectUrl = input.orderId && baseRedirectUrl
      ? `${baseRedirectUrl}${baseRedirectUrl.includes('?') ? '&' : '?'}orderId=${input.orderId}`
      : baseRedirectUrl;

    const embedData = {
      redirecturl: redirectUrl,
      preferred_payment_method: ['zalopay_wallet', 'international_card', 'domestic_card'],
    };
    const item = input.itemDescription ?? [];

    const order = {
      app_id: appId,
      app_trans_id: input.appTransId,
      app_user: input.userRef,
      app_time: Date.now(),
      amount: Math.round(input.amount),
      item: JSON.stringify(item),
      embed_data: JSON.stringify(embedData),
      description: input.orderInfo,
      bank_code: input.bankCode ?? '',
      callback_url: callbackUrl,
    };

    const macData =
      order.app_id +
      '|' +
      order.app_trans_id +
      '|' +
      order.app_user +
      '|' +
      order.amount +
      '|' +
      order.app_time +
      '|' +
      order.embed_data +
      '|' +
      order.item;
    const mac = crypto.createHmac('sha256', key1).update(macData).digest('hex');

    const body = new URLSearchParams({ ...this.toStringObject(order), mac });

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch (err) {
      this.logger.error('Không kết nối được ZaloPay', err as Error);
      throw new InternalServerErrorException('Không thể tạo đơn ZaloPay');
    }

    const json = (await response.json()) as ZaloPayCreateOrderResponse;
    if (json.return_code !== 1) {
      this.logger.warn(`ZaloPay tạo đơn thất bại: ${JSON.stringify(json)}`);
    }
    return json;
  }

  verifyCallback(body: ZaloPayCallbackBody): { valid: boolean; data: ZaloPayCallbackData | null } {
    const key2 = this.requireConfig('ZALO_KEY2');
    const expectedMac = crypto.createHmac('sha256', key2).update(body.data).digest('hex');
    if (expectedMac !== body.mac) return { valid: false, data: null };

    try {
      const data = JSON.parse(body.data) as ZaloPayCallbackData;
      return { valid: true, data };
    } catch {
      return { valid: false, data: null };
    }
  }

  async queryStatus(appTransId: string): Promise<{ return_code: number; return_message: string; amount?: number; zp_trans_id?: number }> {
    const appId = Number(this.requireConfig('ZALO_APP_ID'));
    const key1 = this.requireConfig('ZALO_KEY1');
    const endpoint = this.configService.get<string>(
      'ZALO_QUERY_URL',
      'https://sb-openapi.zalopay.vn/v2/query',
    );

    const macData = `${appId}|${appTransId}|${key1}`;
    const mac = crypto.createHmac('sha256', key1).update(macData).digest('hex');

    const body = new URLSearchParams({
      app_id: String(appId),
      app_trans_id: appTransId,
      mac,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return response.json();
  }

  buildAppTransId(transactionId: number): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
    return `${yy}${mm}${dd}_${transactionId}_${rand}`;
  }

  private toStringObject(obj: Record<string, any>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) out[k] = String(v);
    return out;
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      this.logger.error(`Thiếu biến môi trường: ${key}`);
      throw new Error(`Cấu hình ZaloPay không đầy đủ: ${key}`);
    }
    return value;
  }
}
