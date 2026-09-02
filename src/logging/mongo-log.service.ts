import { Injectable, Logger } from '@nestjs/common';
import mongoose from 'mongoose';
import { Model, Schema, model, models } from 'mongoose';
import { EnvConfig } from '../config/env/env.config';

export interface AppLog {
  level: 'info' | 'error' | 'warn';
  message: string;
  context?: string;
  meta?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * MongoLogService — service penulisan log ke MongoDB.
 * SOLID: cuma satu job (persist log). Dipanggil dari mana pun butuh log.
 * NOTE: collection terpisah (app_logs) dari business data.
 */
@Injectable()
export class MongoLogService {
  private readonly logger = new Logger(MongoLogService.name);
  private readonly model: Model<AppLog>;

  constructor(config: EnvConfig) {
    const schema = new Schema<AppLog>(
      {
        level: { type: String, enum: ['info', 'error', 'warn'], default: 'info' },
        message: { type: String, required: true },
        context: { type: String },
        meta: { type: Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now },
      },
      { collection: config.mongoLogCollection || 'app_logs' },
    );
    // Reuse model kalau sudah dibuat (hot-reload safe)
    this.model =
      (models.AppLog as Model<AppLog> | undefined) ??
      model<AppLog>('AppLog', schema);
  }

  async log(entry: Omit<AppLog, 'timestamp'>): Promise<void> {
    // Kalau MongoDB belum/koneksinya terputus, langsung skip (jangan buffer 10s).
    if (mongoose.connection.readyState !== 1) return;
    try {
      await this.model.create({ ...entry, timestamp: new Date() });
    } catch (err) {
      // Jangan pernah gagal karena logging — swallow
      // eslint-disable-next-line no-console
      console.error(`[LOG-MONGO] Gagal menulis log: ${String(err)}`);
    }
  }

  info(message: string, context?: string, meta?: Record<string, unknown>): Promise<void> {
    return this.log({ level: 'info', message, context, meta });
  }

  error(message: string, context?: string, meta?: Record<string, unknown>): Promise<void> {
    return this.log({ level: 'error', message, context, meta });
  }

  warn(message: string, context?: string, meta?: Record<string, unknown>): Promise<void> {
    return this.log({ level: 'warn', message, context, meta });
  }

  /** Query log terbaru (dipakai endpoint /logs bila perlu). */
  async findRecent(limit = 50, query: Record<string, unknown> = {}): Promise<AppLog[]> {
    return this.model
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec() as unknown as Promise<AppLog[]>;
  }
}
