import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Observable, tap } from 'rxjs';
import { AppLoggerService } from '../../logging/app-logger.service';

/**
 * HttpLoggingInterceptor — log request & response terstruktur (pino).
 * SOLID: cross-cutting concern (logging) dipisah dari business logic.
 * Didaftarkan via APP_INTERCEPTOR di AppModule supaya dapat dependency injection
 * (AppLoggerService global).
 *
 * Output structured: { reqId, method, url, status, durationMs, ip, userAgent }
 * (field sensitive seperti authorization/cookie di-redact pino).
 */
@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger: AppLoggerService;

  constructor(appLogger: AppLoggerService) {
    this.logger = appLogger.child(HttpLoggingInterceptor.name);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<FastifyRequest>();
    const start = Date.now();
    const method = req.method;
    const url = req.url;
    const reqId = (req as { id?: string }).id ?? 'n/a';
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const status = http.getResponse().statusCode;
          this.logger.info('http request completed', undefined, {
            reqId,
            method,
            url,
            status,
            durationMs: duration,
            ip,
            userAgent,
          });
        },
        error: (err: { status?: number; message?: string }) => {
          const duration = Date.now() - start;
          const status = err?.status ?? 500;
          this.logger.error('http request failed', undefined, {
            reqId,
            method,
            url,
            status,
            durationMs: duration,
            ip,
            message: err?.message,
          });
        },
      }),
    );
  }
}
