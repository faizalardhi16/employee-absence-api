import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/auth.decorators';
import { HealthService, HealthStatus } from './health.service';

/**
 * HealthController — endpoint /health untuk readiness & liveness.
 * SOLID: controller cuma routing ke HealthService.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check semua dependensi (PG, Redis, Mongo, Storage)' })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
