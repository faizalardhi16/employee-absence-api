import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ClockAuditEntry, DataStoreRecord, UarPermission, UarRole, UarRolePermissionMap, UarUser, UarUserRoleMap } from './entities';
import { InitTables1756000000000 } from './migrations/1756000000000-InitTables';
import { CreateClockAuditEntries1756100000000 } from './migrations/1756100000000-CreateClockAuditEntries';

/**
 * DataSource untuk TypeORM CLI (migration:generate / migration:run / dsb).
 * Dipakai lewat npm script `typeorm` — bukan bagian dari runtime NestJS
 * (runtime pakai TypeOrmModule di DatabaseModule).
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'nest_fastify',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [UarUser, UarRole, UarPermission, UarUserRoleMap, UarRolePermissionMap, DataStoreRecord, ClockAuditEntry],
  migrations: [InitTables1756000000000, CreateClockAuditEntries1756100000000],
  synchronize: false,
  logging: false,
});