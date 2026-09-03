import { Module } from '@nestjs/common';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeTrackingService } from './time-tracking.service';

/**
 * TimeTrackingModule — audit log clock-in/clock-out (append-only).
 * Repository ClockAuditEntry sudah terdaftar di DatabaseModule (global).
 */
@Module({
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}