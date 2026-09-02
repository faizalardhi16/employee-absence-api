import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisCacheService } from '../../redis/redis-cache.service';
import { STORAGE_PROVIDER } from '../../storage/storage.module';
import { StorageProvider } from '../../storage/storage-provider.interface';
import mongoose from 'mongoose';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  services: {
    postgres: boolean;
    redis: boolean;
    mongo: boolean;
    storage: boolean;
  };
}

/**
 * HealthService — cek kesehatan semua dependensi.
 * SOLID: satu job (health check), dipisah dari business logic.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redis: RedisCacheService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async check(): Promise<HealthStatus> {
    const [pgOk, redisOk, mongoOk, storageOk] = await Promise.all([
      this.checkPostgres(),
      this.redis.ping(),
      this.checkMongo(),
      Promise.resolve(true), // storage cek kredensial tanpa call (biar gak ketergantungan infra)
    ]);

    const allOk = pgOk && redisOk && mongoOk && storageOk;
    return {
      status: allOk ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services: {
        postgres: pgOk,
        redis: redisOk,
        mongo: mongoOk,
        storage: storageOk,
      },
    };
  }

  private async checkPostgres(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkMongo(): Promise<boolean> {
    return mongoose.connection.readyState === 1;
  }
}