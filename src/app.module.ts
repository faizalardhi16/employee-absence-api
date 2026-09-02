import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { LoggingModule } from './logging/logging.module';
import { RedisModule } from './redis/redis.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { CsrfModule } from './modules/csrf/csrf.module';
import { CsrfGuard } from './modules/csrf/csrf.guard';
import { HealthModule } from './modules/health/health.module';
import { DataModule } from './modules/data/data.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';

/**
 * AppModule — root module. Merakit seluruh concern.
 * SOLID: modul ini cuma wiring (composition root), tanpa logic bisnis.
 */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule, // PostgreSQL + TypeORM
    LoggingModule, // MongoDB logging
    RedisModule, // Redis cache
    StorageModule, // S3 (AWS/Alibaba)
    AuthModule, // JWT + cookie
    CsrfModule, // Proteksi CSRF global (double-submit cookie + HMAC)
    HealthModule, // /health
    DataModule, // CRUD demo MongoDB/Redis/PostgreSQL
  ],
  providers: [
    // CSRF check jalan PALING AWAL (sebelum auth) supaya request invalid fail-fast.
    { provide: APP_GUARD, useClass: CsrfGuard },
    // Global auth guard: semua route protected kecuali @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global RBAC guard: cek @RequirePermissions() setelah auth (urutan penting)
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Envelope response + logging
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: HttpLoggingInterceptor },
  ],
})
export class AppModule {}
