import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnvConfig } from '../config/env/env.config';
import {
  DataStoreRecord,
  UarPermission,
  UarRole,
  UarRolePermissionMap,
  UarUser,
  UarUserRoleMap,
} from './entities';

/**
 * DatabaseModule — koneksi PostgreSQL via TypeORM.
 * SOLID: module ini expose semua repository (TypeOrmModule) secara global,
 * jadi service mana pun bisa @InjectRepository tanpa import ulang.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [EnvConfig],
      useFactory: (config: EnvConfig) => ({
        type: 'postgres',
        host: config.dbHost,
        port: config.dbPort,
        username: config.dbUser,
        password: config.dbPassword,
        database: config.dbName,
        ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: false, // schema dikelola via migrasi (TypeORM CLI)
      }),
    }),
    TypeOrmModule.forFeature([
      UarUser,
      UarRole,
      UarPermission,
      UarUserRoleMap,
      UarRolePermissionMap,
      DataStoreRecord,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}