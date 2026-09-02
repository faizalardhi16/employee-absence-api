import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { EnvConfig } from '../config/env/env.config';
import { MongoLogService } from './mongo-log.service';
import { AppLoggerService } from './app-logger.service';
import { buildPinoLogger } from './pino-logger';
import { PINO_LOGGER, PINO_LEVEL } from './logger.constants';

/**
 * LoggingModule — logger terstruktur berbasis pino + sink MongoDB.
 * SOLID: satu module, satu concern — logging.
 *
 * Provider:
 *  - buildPinoLogger => instance pino (file: app.log, error.log; console pretty di dev)
 *  - AppLoggerService => implementasi LoggerService NestJS (dipakai inject di mana-mana)
 *  - MongoLogService   => persist log ke MongoDB (fire-and-forget, graceful kalau offline)
 */
@Global()
@Module({
  providers: [
    MongoLogService,
    {
      provide: PINO_LOGGER,
      inject: [EnvConfig],
      useFactory: (config: EnvConfig) => buildPinoLogger(config).logger,
    },
    {
      provide: PINO_LEVEL,
      inject: [EnvConfig],
      useFactory: (config: EnvConfig) => buildPinoLogger(config).level,
    },
    AppLoggerService,
  ],
  exports: [MongoLogService, AppLoggerService],
})
export class LoggingModule implements OnModuleDestroy {
  private readonly logger: AppLoggerService;

  constructor(
    private readonly config: EnvConfig,
    appLogger: AppLoggerService,
  ) {
    this.logger = appLogger.child(LoggingModule.name);
  }

  async onModuleInit(): Promise<void> {
    if (!this.config.mongoUrl) return;
    try {
      await mongoose.connect(this.config.mongoUrl, {
        dbName: this.config.mongoDb,
        serverSelectionTimeoutMS: 5000,
      });
      this.logger.info('MongoDB logging connected', undefined, {
        url: this.config.mongoUrl,
      });
    } catch (err) {
      // JANGAN crash app kalau Mongo offline — tetap jalan, log lewat pino.
      this.logger.warn('MongoDB logging tidak tersedia saat init (degraded)', undefined, {
        error: String(err),
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await mongoose.disconnect();
  }
}
