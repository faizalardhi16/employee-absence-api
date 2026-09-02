import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataStoreRecord } from '../../database/entities';
import { CreateItemDto } from './dto/create-item.dto';

/**
 * PgDataService — CRUD item ke PostgreSQL via TypeORM.
 * SOLID: service ini cuma tau satu store (PG) via repository global.
 */
@Injectable()
export class PgDataService {
  constructor(
    @InjectRepository(DataStoreRecord)
    private readonly recordsRepo: Repository<DataStoreRecord>,
  ) {}

  async create(dto: CreateItemDto): Promise<DataStoreRecord> {
    const existing = await this.recordsRepo.findOneBy({ itemKey: dto.key });
    if (existing) {
      throw new NotFoundException(`Item PostgreSQL "${dto.key}" sudah ada`);
    }
    return this.recordsRepo.save({
      itemKey: dto.key,
      value: dto.value,
      meta: dto.meta ?? null,
    });
  }

  async get(key: string): Promise<DataStoreRecord> {
    const row = await this.recordsRepo.findOneBy({ itemKey: key });
    if (!row) {
      throw new NotFoundException(`Item PostgreSQL "${key}" tidak ditemukan`);
    }
    return row;
  }
}