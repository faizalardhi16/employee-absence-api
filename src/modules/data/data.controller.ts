import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateItemDto } from './dto/create-item.dto';
import { MongoDataService } from './mongo-data.service';
import { RedisDataService } from './redis-data.service';
import { PgDataService } from './pg-data.service';

/**
 * DataController — endpoint CRUD demo untuk MongoDB, Redis, dan PostgreSQL.
 * SOLID: controller cuma routing; logic ada di masing-masing service.
 */
@ApiTags('Data Store')
@Controller('data')
export class DataController {
  constructor(
    private readonly mongo: MongoDataService,
    private readonly redis: RedisDataService,
    private readonly pg: PgDataService,
  ) {}

  // ---------------- MongoDB ----------------

  @Post('mongo')
  @ApiOperation({ summary: 'Create item ke MongoDB' })
  createMongo(@Body() dto: CreateItemDto) {
    return this.mongo.create(dto);
  }

  @Get('mongo/:key')
  @ApiOperation({ summary: 'Get item dari MongoDB by key' })
  getMongo(@Param('key') key: string) {
    return this.mongo.get(key);
  }

  // ---------------- Redis ----------------

  @Post('redis')
  @ApiOperation({ summary: 'Create item ke Redis' })
  createRedis(@Body() dto: CreateItemDto) {
    return this.redis.create(dto);
  }

  @Get('redis/:key')
  @ApiOperation({ summary: 'Get item dari Redis by key' })
  getRedis(@Param('key') key: string) {
    return this.redis.get(key);
  }

  // ---------------- PostgreSQL ----------------

  @Post('postgres')
  @ApiOperation({ summary: 'Create item ke PostgreSQL' })
  createPostgres(@Body() dto: CreateItemDto) {
    return this.pg.create(dto);
  }

  @Get('postgres/:key')
  @ApiOperation({ summary: 'Get item dari PostgreSQL by key' })
  getPostgres(@Param('key') key: string) {
    return this.pg.get(key);
  }
}
