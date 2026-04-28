import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { OrderActivityLog, OrderActivityStatus } from './entities/order-activity-log.entity';

export interface ActivityActor {
  name: string;
  role: string;
  id?: number | null;
}

@Injectable()
export class OrderActivityLogService {
  async log(
    manager: EntityManager,
    donHangId: number,
    actor: ActivityActor,
    action: string,
    detail?: string,
    trangThaiDon?: OrderActivityStatus | null,
  ): Promise<void> {
    await manager.save(
      OrderActivityLog,
      manager.create(OrderActivityLog, {
        donHangId,
        actorName: actor.name,
        actorRole: actor.role,
        actorId: actor.id ?? null,
        action,
        detail: detail ?? null,
        trangThaiDon: trangThaiDon ?? null,
      }),
    );
  }

  async resolveEmployeeActor(manager: EntityManager, employeeId: number): Promise<ActivityActor> {
    const [row]: Array<{ ho_ten: string }> = await manager.query(
      `SELECT ho_ten FROM nhan_vien WHERE nhan_vien_id = ? LIMIT 1`,
      [employeeId],
    );
    return {
      id: employeeId,
      name: row?.ho_ten ?? 'Nhân viên',
      role: 'Nhân viên',
    };
  }
}
