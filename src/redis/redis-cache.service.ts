import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { EnvConfig } from '../config/env/env.config';
import { REDIS_CLIENT } from './redis.constants';

/**
 * RedisCacheService — abstraction layer cache di atas ioredis.
 * SOLID: service cache cuma tau konsep get/set/delete, gak expose detail ioredis.
 */
@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly client: Redis,
    private readonly config: EnvConfig,
  ) {}

  private key(raw: string): string {
    return `${this.config.redisPrefix}${raw}`;
  }

  /**
   * Set cache dengan TTL default dari env (detik).
   * TTL <= 0 => tanpa expire (disimpan permanen sampai di-del manual).
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const ttl = ttlSeconds ?? this.config.redisTtl;
      const raw = JSON.stringify(value);
      if (ttl <= 0) {
        await this.client.set(this.key(key), raw);
      } else {
        await this.client.set(this.key(key), raw, 'EX', ttl);
      }
    } catch (err) {
      this.logger.warn(`[CACHE] set gagal: ${String(err)}`);
    }
  }

  /** Get cache, parse JSON. Return null kalau miss/error. */
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(this.key(key));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn(`[CACHE] get gagal: ${String(err)}`);
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(this.key(key));
    } catch (err) {
      this.logger.warn(`[CACHE] del gagal: ${String(err)}`);
    }
  }

  /** Hapus semua key dengan prefix tertentu (untuk invalidasi). */
  async delByPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(this.key(pattern));
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      this.logger.warn(`[CACHE] delByPattern gagal: ${String(err)}`);
    }
  }

  /** Ping — cek koneksi redis sehat. */
  async ping(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
