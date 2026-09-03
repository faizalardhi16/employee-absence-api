import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ClockAuditEntry } from '../../database/entities';
import {
  AuthUser,
  CurrentUser,
  RequirePermissions,
} from '../auth/decorators/auth.decorators';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { ClockActionDto } from './dto/clock-action.dto';
import { PERMISSION_READ_AUDIT_LOG } from './time-tracking.constants';
import { TimeTrackingService } from './time-tracking.service';

/**
 * TimeTrackingController — endpoint time-tracking.
 *
 * - POST /time-tracking/clock        : submit clock-in/clock-out. Setiap request
 *   (valid maupun invalid) menghasilkan persis satu entri audit.
 * - GET  /time-tracking/audit-log    : interface read-only (HR/payroll/compliance),
 *   filter user ID + rentang tanggal, urut kronologis.
 *
 * Tidak ada endpoint update/delete untuk entri audit (write-only).
 */
@ApiTags('Time Tracking')
@ApiCookieAuth()
@Controller('time-tracking')
export class TimeTrackingController {
  constructor(private readonly timeTrackingService: TimeTrackingService) {}

  @Post('clock')
  @ApiOperation({
    summary: 'Submit clock-in/clock-out action (selalu mencatat satu entri audit)',
  })
  async clock(
    @CurrentUser() user: AuthUser,
    @Body() dto: ClockActionDto,
    @Req() request: FastifyRequest,
  ): Promise<ClockAuditEntry> {
    return this.timeTrackingService.recordClockAction({
      userId: user.userId,
      action: dto.action,
      originalTimestamp: dto.originalTimestamp,
      sourceClientType: dto.sourceClientType,
      deviceIdentifier: dto.deviceIdentifier ?? null,
      ipAddress: dto.ipAddress ?? this.extractIp(request),
    });
  }

  @Get('audit-log')
  @RequirePermissions(PERMISSION_READ_AUDIT_LOG)
  @ApiOperation({
    summary: 'Query audit log (read-only): filter user ID & rentang tanggal, urut kronologis',
  })
  async auditLog(@Query() query: AuditLogQueryDto): Promise<ClockAuditEntry[]> {
    return this.timeTrackingService.getAuditLog(query);
  }

  private extractIp(request: FastifyRequest): string | null {
    const forwarded = request.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
    return request.ip ?? null;
  }
}