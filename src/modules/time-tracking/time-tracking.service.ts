import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsOrder,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { ClockAuditEntry } from '../../database/entities';
import {
  CLOCK_ACTION_CLOCK_IN,
  CLOCK_ACTION_CLOCK_OUT,
  CLOCK_OUTCOME_FAILURE,
  CLOCK_OUTCOME_SUCCESS,
  FAILURE_REASON_DUPLICATE_ACTION,
  FAILURE_REASON_INVALID_ACTION,
  FAILURE_REASON_INVALID_SOURCE_CLIENT,
  FAILURE_REASON_INVALID_TIMESTAMP,
  SOURCE_CLIENT_TYPES,
} from './time-tracking.constants';

export interface RecordClockActionInput {
  userId: number;
  action?: string;
  originalTimestamp?: string;
  sourceClientType?: string;
  deviceIdentifier?: string | null;
  ipAddress?: string | null;
}

export interface AuditLogQuery {
  userId?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * TimeTrackingService — mencatat & membaca audit log clock-in/clock-out.
 *
 * Invariant kunci:
 *  - Setiap request clock action => persis SATU entri audit (SUCCESS/FAILURE).
 *  - Entri immutable: tidak ada method update/delete (hanya insert + read).
 *  - eventTimestamp = server receipt time (UTC). originalTimestamp = nilai
 *    client bila diberikan, jika tidak sama dengan eventTimestamp.
 *  - Validasi dilakukan di sini (bukan DTO) supaya attempt yang invalid tetap
 *    menghasilkan entri audit FAILURE beserta failure reason.
 */
@Injectable()
export class TimeTrackingService {
  constructor(
    @InjectRepository(ClockAuditEntry)
    private readonly auditRepo: Repository<ClockAuditEntry>,
  ) {}

  /** Catat satu attempt clock action dan kembalikan entri audit-nya. */
  async recordClockAction(input: RecordClockActionInput): Promise<ClockAuditEntry> {
    const receiptTime = new Date();
    const action = typeof input.action === 'string' ? input.action.trim().toUpperCase() : '';
    const sourceClientType = typeof input.sourceClientType === 'string' ? input.sourceClientType : 'web';
    const originalTimestamp = this.parseTimestamp(input.originalTimestamp);

    let outcome = CLOCK_OUTCOME_SUCCESS;
    let failureReason: string | null = null;

    if (!this.isValidAction(action)) {
      outcome = CLOCK_OUTCOME_FAILURE;
      failureReason = FAILURE_REASON_INVALID_ACTION;
    } else if (!this.isValidSourceClientType(sourceClientType)) {
      outcome = CLOCK_OUTCOME_FAILURE;
      failureReason = FAILURE_REASON_INVALID_SOURCE_CLIENT;
    } else if (this.hasOriginalTimestamp(input.originalTimestamp) && !originalTimestamp) {
      outcome = CLOCK_OUTCOME_FAILURE;
      failureReason = FAILURE_REASON_INVALID_TIMESTAMP;
    } else if (await this.isDuplicateClockAction(input.userId, action)) {
      outcome = CLOCK_OUTCOME_FAILURE;
      failureReason = FAILURE_REASON_DUPLICATE_ACTION;
    }

    const entry = this.auditRepo.create({
      userId: input.userId,
      action,
      eventTimestamp: receiptTime,
      originalTimestamp: originalTimestamp ?? receiptTime,
      sourceClientType,
      deviceIdentifier: input.deviceIdentifier ?? null,
      ipAddress: input.ipAddress ?? null,
      outcome,
      failureReason,
    });

    return this.auditRepo.save(entry);
  }

  /** Query read-only, urut kronologis, filter user ID & rentang tanggal. */
  async getAuditLog(query: AuditLogQuery): Promise<ClockAuditEntry[]> {
    const where: FindOptionsWhere<ClockAuditEntry> = {};
    if (query.userId !== undefined) {
      where.userId = query.userId;
    }

    const start = this.parseTimestamp(query.startDate);
    const end = this.parseTimestamp(query.endDate);
    if (query.startDate !== undefined && !start) {
      throw new BadRequestException('Invalid startDate; harus berupa timestamp UTC ISO 8601 yang valid');
    }
    if (query.endDate !== undefined && !end) {
      throw new BadRequestException('Invalid endDate; harus berupa timestamp UTC ISO 8601 yang valid');
    }

    if (start && end) {
      where.eventTimestamp = Between(start, end);
    } else if (start) {
      where.eventTimestamp = MoreThanOrEqual(start);
    } else if (end) {
      where.eventTimestamp = LessThanOrEqual(end);
    }

    const order: FindOptionsOrder<ClockAuditEntry> = {
      eventTimestamp: 'ASC',
      id: 'ASC',
    };

    return this.auditRepo.find({ where, order });
  }

  private hasOriginalTimestamp(value?: string): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  private isValidAction(action: string): boolean {
    return action === CLOCK_ACTION_CLOCK_IN || action === CLOCK_ACTION_CLOCK_OUT;
  }

  private isValidSourceClientType(source: string): boolean {
    return (SOURCE_CLIENT_TYPES as readonly string[]).includes(source);
  }

  /**
   * Deteksi aksi clock ganda: bandingkan dengan entri SUCCESS terakhir user.
   * Aksi sama beruntun (mis. CLOCK_IN dua kali) => FAILURE "duplicate clock action".
   */
  private async isDuplicateClockAction(userId: number, action: string): Promise<boolean> {
    const last = await this.auditRepo.findOne({
      where: { userId, outcome: CLOCK_OUTCOME_SUCCESS },
      order: { eventTimestamp: 'DESC', id: 'DESC' },
    });
    return !!last && last.action === action;
  }

  private parseTimestamp(value?: string): Date | null {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'string') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }
}