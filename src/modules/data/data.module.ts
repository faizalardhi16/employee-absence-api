import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { MongoDataService } from './mongo-data.service';
import { RedisDataService } from './redis-data.service';
import { PgDataService } from './pg-data.service';

/**
 * DataModule — demo CRUD ke MongoDB, Redis, PostgreSQL.
 * SOLID: module ini ngerakit controller + service; store sudah disediakan
 * module global (DatabaseModule, RedisModule, mongodb via mongoose).
 */
@Module({
  controllers: [DataController],
  providers: [MongoDataService, RedisDataService, PgDataService],
})
export class DataModule {}
