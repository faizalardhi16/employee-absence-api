import { Injectable, NotFoundException } from '@nestjs/common';
import mongoose, { Model, Schema, model, models } from 'mongoose';
import { CreateItemDto } from './dto/create-item.dto';

export interface DataStoreItem {
  itemKey: string;
  value: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * MongoDataService — CRUD sederhana item ke MongoDB (collection `datastore_items`).
 * SOLID: service cuma tau satu store (Mongo), dipisah dari Redis & PG.
 * Catatan: collection ini BEDA dari collection logging; bisnis data terpisah dari log.
 */
@Injectable()
export class MongoDataService {
  private readonly model: Model<DataStoreItem>;

  constructor() {
    const schema = new Schema<DataStoreItem>(
      {
        itemKey: { type: String, required: true, unique: true },
        value: { type: String, required: true },
        meta: { type: Schema.Types.Mixed },
        createdAt: { type: Date, default: Date.now },
      },
      { collection: 'datastore_items' },
    );
    this.model =
      (models.DataStoreItem as Model<DataStoreItem> | undefined) ??
      model<DataStoreItem>('DataStoreItem', schema);
  }

  private get isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  async create(dto: CreateItemDto): Promise<DataStoreItem> {
    if (!this.isConnected) {
      throw new NotFoundException('MongoDB tidak terhubung');
    }
    const doc = await this.model.create({
      itemKey: dto.key,
      value: dto.value,
      meta: dto.meta,
      createdAt: new Date(),
    });
    return doc.toObject();
  }

  async get(key: string): Promise<DataStoreItem> {
    if (!this.isConnected) {
      throw new NotFoundException('MongoDB tidak terhubung');
    }
    const doc = await this.model.findOne({ itemKey: key }).lean().exec();
    if (!doc) {
      throw new NotFoundException(`Item MongoDB "${key}" tidak ditemukan`);
    }
    return doc as unknown as DataStoreItem;
  }
}
