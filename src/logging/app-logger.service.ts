import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Logger as PinoLoggerInstance } from 'pino';
import { PINO_LOGGER, PINO_LEVEL } from './logger.constants';
import { MongoLogService } from './mongo-log.service';

type LogMeta = Record<string, unknown>;

/**
 * AppLoggerService — implementasi LoggerService NestJS berbasis pino.
 * SOLID (DIP): consumer bergantung ke interface (LoggerService), bukan pino langsung.
 * Anak dari setiap service/module bisa bikin instance via .child({ context }).
 *
 * Integrasi MongDB: opsional (fire-and-forget). Kalau Mongo offline, gak nakal —
 * log tetap jalan ke file/console via pino. MongoLogService sendiri sudah try-catch.
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  constructor(
    @Inject(PINO_LOGGER) private readonly logger: PinoLoggerInstance,
    @Inject(PINO_LEVEL) private readonly level: string,
    private readonly mongo?: MongoLogService,
  ) {}

  /** Buat logger ber-child context (misal: module/entity name). */
  child(context: string): AppLoggerService {
    const child = new AppLoggerService(
      this.logger.child({ context }),
      this.level,
      this.mongo,
    );
    return child;
  }

  log(message: string, context?: string, meta?: LogMeta): void {
    this.write('info', message, context, meta);
  }

  info(message: string, context?: string, meta?: LogMeta): void {
    this.write('info', message, context, meta);
  }

  warn(message: string, context?: string, meta?: LogMeta): void {
    this.write('warn', message, context, meta);
  }

  error(message: string, context?: string, meta?: LogMeta): void {
    this.write('error', message, context, meta);
  }

  debug(message: string, context?: string, meta?: LogMeta): void {
    this.write('debug', message, context, meta);
  }

  /** Level minimum yang aktif (buat filter di interceptor dsb). */
  get minLevel(): string {
    return this.level;
  }

  private write(level: 'info' | 'warn' | 'error' | 'debug', message: string, _context?: string, meta?: LogMeta): void {
    const payload = meta ?? {};
    switch (level) {
      case 'warn':
        this.logger.warn(payload, message);
        break;
      case 'error':
        this.logger.error(payload, message);
        break;
      case 'debug':
        this.logger.debug(payload, message);
        break;
      default:
        this.logger.info(payload, message);
        break;
    }

    // Fire-and-forget ke Mongo (kalau tersedia) — abadi untuk query log.
    if (this.mongo && (level === 'info' || level === 'warn' || level === 'error')) {
      void this.mongo.log({ level, message, meta }).catch(() => undefined);
    }
  }
}
