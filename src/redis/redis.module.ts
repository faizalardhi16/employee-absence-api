import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { EnvConfig } from '../config/env/env.config';
import { RedisCacheService } from './redis-cache.service';
import { REDIS_CLIENT } from './redis.constants';
import { AppLoggerService } from '../logging/app-logger.service';

/**
 * RedisModule — setup koneksi Redis untuk cache.
 * SOLID: module cuma nyediain client + service cache. Business app gak tau detail ioredis.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [EnvConfig, AppLoggerService],
      useFactory: (config: EnvConfig, logger: AppLoggerService): Redis => {
        const client = new Redis({
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword || undefined,
          db: config.redisDb,
          lazyConnect: true,
          maxRetriesPerRequest: 2,
          retryStrategy: (times: number) => Math.min(times * 200, 2000),
        });
        // Jangan crash app kalau Redis down — log & reconnect otomatis
        client.on('error', (err) => {
          logger.warn('Redis client error (reconnecting)', undefined, {
            message: err.message,
          });
        });
        return client;
      },
    },
    RedisCacheService,
  ],
  exports: [REDIS_CLIENT, RedisCacheService],
})
export class RedisModule implements OnModuleDestroy {
  private readonly logger: AppLoggerService;

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    appLogger: AppLoggerService,
  ) {
    this.logger = appLogger.child(RedisModule.name);
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.connect();
      this.logger.info('Redis connected');
    } catch (err) {
      this.logger.warn('Redis tidak tersedia saat init (degraded)', undefined, {
        error: String(err),
      });
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
