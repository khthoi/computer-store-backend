import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SupportTicket } from './entities/support-ticket.entity';
import { TicketStatus } from './support.enums';

@Injectable()
export class SupportScheduler {
  private readonly logger = new Logger(SupportScheduler.name);

  constructor(
    @InjectRepository(SupportTicket)
    private readonly ticketRepo: Repository<SupportTicket>,
  ) {}

  // Runs every hour — auto-transitions Moi tickets older than 1 day to DangXuLy
  @Cron(CronExpression.EVERY_HOUR)
  async autoTransitionStaleTickets(): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await this.ticketRepo.update(
      { status: TicketStatus.Moi, createdAt: LessThan(oneDayAgo) },
      { status: TicketStatus.DangXuLy },
    );
    if (result.affected && result.affected > 0) {
      this.logger.log(`Auto-transitioned ${result.affected} stale ticket(s) Moi → DangXuLy`);
    }
  }
}
