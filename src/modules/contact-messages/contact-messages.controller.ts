import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ContactMessagesService } from './contact-messages.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

function extractIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip ?? req.socket?.remoteAddress ?? null;
}

@ApiTags('Contact Messages')
@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly service: ContactMessagesService) {}

  @Public()
  @Get('quota')
  @ApiOperation({ summary: 'Số lần còn lại có thể gửi form trong phiên' })
  getQuota(@Req() req: Request) {
    return this.service.getQuota(extractIp(req));
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Gửi form liên hệ (tối đa 2 lần/phiên/IP)' })
  submit(@Body() dto: CreateContactMessageDto, @Req() req: Request) {
    const ua = req.headers['user-agent'];
    return this.service.submit(
      dto,
      extractIp(req),
      typeof ua === 'string' ? ua : null,
    );
  }
}
