import { Injectable, NotFoundException } from '@nestjs/common';
import { RedisCacheService } from '../../redis/redis-cache.service';
import { CreateItemDto } from './dto/create-item.dto';

export interface RedisDataItem {
  key: string;
  value: string;
}

/**
 * RedisDataService — CRUD item ke Redis (via RedisCacheService abstraction).
 * SOLID: service ini gak tau ioredis langsung — cukup pakai cache abstraction.
 */
@Injectable()
export class RedisDataService {
  constructor(private readonly cache: RedisCacheService) {}

  async create(dto: CreateItemDto): Promise<RedisDataItem> {
    // Prefix ruang data generik biar gak bentrok sama cache bisnis.
    const redisKey = `data:${dto.key}`;
    await this.cache.set(redisKey, dto.value, 0); // TTL 0 = no expire
    return { key: dto.key, value: dto.value };
  }

  async get(key: string): Promise<RedisDataItem> {
    const value = await this.cache.get<string>(`data:${key}`);
    if (value === null) {
      throw new NotFoundException(`Item Redis "${key}" tidak ditemukan`);
    }
    return { key, value };
  }
}
