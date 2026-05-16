import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url } = req;
    const start = Date.now();
    // Strip sensitive query params (e.g. `access_token` used by SSE handshakes)
    // before logging so JWTs never leak into application logs.
    const safeUrl = typeof url === 'string'
      ? url.replace(/([?&])access_token=[^&]*/g, '$1access_token=***')
      : url;

    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        this.logger.log(`${method} ${safeUrl} — ${ms}ms`);
      }),
    );
  }
}
