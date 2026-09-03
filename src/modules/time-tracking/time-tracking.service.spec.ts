import { FindOperator, Repository } from 'typeorm';
import { ClockAuditEntry } from '../../database/entities';
import {
  FAILURE_REASON_DUPLICATE_ACTION,
  FAILURE_REASON_INVALID_ACTION,
  FAILURE_REASON_INVALID_SOURCE_CLIENT,
  FAILURE_REASON_INVALID_TIMESTAMP,
} from './time-tracking.constants';
import { TimeTrackingService } from './time-tracking.service';

const ISO_UTC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type OrderBy = Record<string, 'ASC' | 'DESC'>;

interface MockRepo {
  rows: ClockAuditEntry[];
  save: jest.Mock;
  create: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
}

function createMockRepo(): MockRepo {
  const rows: ClockAuditEntry[] = [];
  let seq = 0;

  const sort = (list: ClockAuditEntry[], order?: OrderBy): ClockAuditEntry[] =>
    [...list].sort((a, b) => {
      for (const [key, dir] of Object.entries(order ?? {})) {
        const av = (a as unknown as Record<string, unknown>)[key] as number;
        const bv = (b as unknown as Record<string, unknown>)[key] as number;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        if (cmp !== 0) return dir === 'DESC' ? -cmp : cmp;
      }
      return 0;
    });

  const matchesWhere = (row: ClockAuditEntry, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([key, expected]) => {
      const actual = (row as unknown as Record<string, unknown>)[key] as number;
      if (expected instanceof FindOperator) {
        const op = expected as FindOperator<Date | number>;
        switch (op.type) {
          case 'between': {
            const [from, to] = op.value as unknown as [Date, Date];
            return actual >= (from as unknown as number) && actual <= (to as unknown as number);
          }
          case 'moreThanOrEqual':
            return actual >= (op.value as unknown as number);
          case 'lessThanOrEqual':
            return actual <= (op.value as unknown as number);
          default:
            return false;
        }
      }
      return actual === (expected as number);
    });

  return {
    rows,
    save: jest.fn(async (entry: ClockAuditEntry) => {
      const clone: ClockAuditEntry = { ...entry, id: entry.id ?? `audit-${++seq}` };
      rows.push(clone);
      return clone;
    }),
    create: jest.fn((entry: Partial<ClockAuditEntry>) => entry as ClockAuditEntry),
    findOne: jest.fn(async (opts?: { where?: Record<string, unknown>; order?: OrderBy }) => {
      const where = opts?.where ?? {};
      const filtered = rows.filter((row) => matchesWhere(row, where));
      return sort(filtered, opts?.order)[0] ?? null;
    }),
    find: jest.fn(async (opts?: { where?: Record<string, unknown>; order?: OrderBy }) => {
      const where = opts?.where ?? {};
      const filtered = rows.filter((row) => matchesWhere(row, where));
      return sort(filtered, opts?.order);
    }),
  };
}

describe('TimeTrackingService', () => {
  let mockRepo: MockRepo;
  let service: TimeTrackingService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-03T12:00:00.000Z'));
    mockRepo = createMockRepo();
    service = new TimeTrackingService(mockRepo as unknown as Repository<ClockAuditEntry>);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('recordClockAction', () => {
    it('AC1: successful CLOCK_IN creates exactly one SUCCESS entry with user id, UTC timestamp and source client type', async () => {
      const entry = await service.recordClockAction({
        userId: 42,
        action: 'CLOCK_IN',
        sourceClientType: 'mobile',
        deviceIdentifier: 'dev-123',
        ipAddress: '10.0.0.1',
      });

      expect(mockRepo.rows).toHaveLength(1);
      expect(entry.action).toBe('CLOCK_IN');
      expect(entry.outcome).toBe('SUCCESS');
      expect(entry.userId).toBe(42);
      expect(entry.sourceClientType).toBe('mobile');
      expect(entry.deviceIdentifier).toBe('dev-123');
      expect(entry.ipAddress).toBe('10.0.0.1');
      expect(entry.eventTimestamp.toISOString()).toMatch(ISO_UTC_REGEX);
      expect(entry.eventTimestamp.toISOString()).toBe('2026-09-03T12:00:00.000Z');
    });

    it('AC2: successful CLOCK_OUT after CLOCK_IN creates exactly one SUCCESS entry', async () => {
      await service.recordClockAction({ userId: 7, action: 'CLOCK_IN', sourceClientType: 'web' });
      jest.setSystemTime(new Date('2026-09-03T20:00:00.000Z'));
      const entry = await service.recordClockAction({
        userId: 7,
        action: 'CLOCK_OUT',
        sourceClientType: 'web',
      });

      expect(mockRepo.rows).toHaveLength(2);
      expect(entry.action).toBe('CLOCK_OUT');
      expect(entry.outcome).toBe('SUCCESS');
      expect(entry.userId).toBe(7);
      expect(entry.eventTimestamp.toISOString()).toBe('2026-09-03T20:00:00.000Z');
    });

    it('AC3: failed attempt (invalid timestamp) creates exactly one FAILURE entry with a reason', async () => {
      const entry = await service.recordClockAction({
        userId: 1,
        action: 'CLOCK_IN',
        originalTimestamp: 'not-a-timestamp',
        sourceClientType: 'web',
      });

      expect(mockRepo.rows).toHaveLength(1);
      expect(entry.outcome).toBe('FAILURE');
      expect(entry.failureReason).toBe(FAILURE_REASON_INVALID_TIMESTAMP);
      expect(entry.userId).toBe(1);
    });

    it('AC3: failed attempt (invalid action) creates exactly one FAILURE entry with a reason', async () => {
      const entry = await service.recordClockAction({
        userId: 2,
        action: 'PUNCH_IN',
        sourceClientType: 'web',
      });

      expect(mockRepo.rows).toHaveLength(1);
      expect(entry.outcome).toBe('FAILURE');
      expect(entry.failureReason).toBe(FAILURE_REASON_INVALID_ACTION);
    });

    it('AC3: failed attempt (invalid source client type) creates exactly one FAILURE entry with a reason', async () => {
      const entry = await service.recordClockAction({
        userId: 3,
        action: 'CLOCK_IN',
        sourceClientType: 'kiosk',
      });

      expect(mockRepo.rows).toHaveLength(1);
      expect(entry.outcome).toBe('FAILURE');
      expect(entry.failureReason).toBe(FAILURE_REASON_INVALID_SOURCE_CLIENT);
    });

    it('AC3 + AC8: duplicate clock action creates exactly one FAILURE entry with duplicate reason', async () => {
      await service.recordClockAction({ userId: 5, action: 'CLOCK_IN', sourceClientType: 'web' });
      const duplicate = await service.recordClockAction({
        userId: 5,
        action: 'CLOCK_IN',
        sourceClientType: 'web',
      });

      expect(mockRepo.rows).toHaveLength(2);
      expect(duplicate.outcome).toBe('FAILURE');
      expect(duplicate.failureReason).toBe(FAILURE_REASON_DUPLICATE_ACTION);
    });

    it('AC6: when no original timestamp is supplied, receipt time is used for both event and original timestamp', async () => {
      const entry = await service.recordClockAction({
        userId: 3,
        action: 'CLOCK_IN',
        sourceClientType: 'time_terminal',
      });

      expect(entry.eventTimestamp.getTime()).toBe(new Date('2026-09-03T12:00:00.000Z').getTime());
      expect(entry.originalTimestamp.getTime()).toBe(entry.eventTimestamp.getTime());
      expect(entry.originalTimestamp.toISOString()).toBe('2026-09-03T12:00:00.000Z');
    });

    it('uses the supplied original timestamp when valid, keeping event timestamp as receipt time', async () => {
      const entry = await service.recordClockAction({
        userId: 9,
        action: 'CLOCK_IN',
        originalTimestamp: '2026-09-03T07:45:00.000Z',
        sourceClientType: 'mobile',
      });

      expect(entry.originalTimestamp.toISOString()).toBe('2026-09-03T07:45:00.000Z');
      expect(entry.eventTimestamp.toISOString()).toBe('2026-09-03T12:00:00.000Z');
      expect(entry.outcome).toBe('SUCCESS');
    });

    it('AC7: all stored timestamps are UTC ISO 8601', async () => {
      await service.recordClockAction({ userId: 8, action: 'CLOCK_IN', sourceClientType: 'web' });
      jest.setSystemTime(new Date('2026-09-04T09:00:00.000Z'));
      await service.recordClockAction({
        userId: 8,
        action: 'CLOCK_OUT',
        originalTimestamp: '2026-09-04T09:00:00.000Z',
        sourceClientType: 'web',
      });

      for (const row of mockRepo.rows) {
        expect(row.eventTimestamp.toISOString()).toMatch(ISO_UTC_REGEX);
        expect(row.originalTimestamp.toISOString()).toMatch(ISO_UTC_REGEX);
      }
    });

    it('AC4: every audit entry has a unique id', async () => {
      for (let i = 0; i < 5; i += 1) {
        jest.setSystemTime(new Date(`2026-09-03T12:0${i}:00.000Z`));
        await service.recordClockAction({
          userId: 100,
          action: i % 2 === 0 ? 'CLOCK_IN' : 'CLOCK_OUT',
          sourceClientType: 'web',
        });
      }

      const ids = mockRepo.rows.map((row) => row.id);
      expect(new Set(ids).size).toBe(mockRepo.rows.length);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    });

    it('AC8: each request produces exactly one entry, including invalid attempts', async () => {
      await service.recordClockAction({ userId: 11, action: 'CLOCK_IN', sourceClientType: 'web' });
      await service.recordClockAction({
        userId: 11,
        action: 'CLOCK_IN',
        originalTimestamp: 'bad-date',
        sourceClientType: 'web',
      });
      await service.recordClockAction({ userId: 11, action: 'CLOCK_IN', sourceClientType: 'web' });
      await service.recordClockAction({ userId: 11, action: 'WEIRD', sourceClientType: 'web' });
      await service.recordClockAction({ userId: 11, action: 'CLOCK_OUT', sourceClientType: 'web' });

      expect(mockRepo.rows).toHaveLength(5);
      expect(mockRepo.rows.map((row) => row.outcome)).toEqual([
        'SUCCESS',
        'FAILURE',
        'FAILURE',
        'FAILURE',
        'SUCCESS',
      ]);
    });
  });

  describe('getAuditLog', () => {
    beforeEach(async () => {
      jest.setSystemTime(new Date('2026-09-01T08:00:00.000Z'));
      await service.recordClockAction({ userId: 5, action: 'CLOCK_IN', sourceClientType: 'web' });
      jest.setSystemTime(new Date('2026-09-02T08:00:00.000Z'));
      await service.recordClockAction({ userId: 5, action: 'CLOCK_OUT', sourceClientType: 'web' });
      jest.setSystemTime(new Date('2026-09-02T09:00:00.000Z'));
      await service.recordClockAction({ userId: 6, action: 'CLOCK_IN', sourceClientType: 'web' });
    });

    it('AC5: filters by user id and returns entries in chronological order', async () => {
      const results = await service.getAuditLog({ userId: 5 });

      expect(results).toHaveLength(2);
      expect(results.every((row) => row.userId === 5)).toBe(true);
      expect(results[0].action).toBe('CLOCK_IN');
      expect(results[1].action).toBe('CLOCK_OUT');
      expect(
        results[0].eventTimestamp.getTime() <= results[1].eventTimestamp.getTime(),
      ).toBe(true);
    });

    it('AC5: filters by date range (startDate + endDate)', async () => {
      const results = await service.getAuditLog({
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-01T23:59:59.000Z',
      });

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('CLOCK_IN');
      expect(results[0].userId).toBe(5);
    });

    it('AC5: combines user id and date range filters', async () => {
      const results = await service.getAuditLog({
        userId: 6,
        startDate: '2026-09-02T00:00:00.000Z',
        endDate: '2026-09-30T00:00:00.000Z',
      });

      expect(results).toHaveLength(1);
      expect(results[0].action).toBe('CLOCK_IN');
      expect(results[0].userId).toBe(6);
    });

    it('returns all entries (chronological) when no filter is provided', async () => {
      const results = await service.getAuditLog({});

      expect(results).toHaveLength(3);
      expect(results[0].action).toBe('CLOCK_IN');
      expect(results[1].action).toBe('CLOCK_OUT');
      expect(results[2].action).toBe('CLOCK_IN');
    });

    it('rejects an invalid startDate with BadRequestException', async () => {
      await expect(
        service.getAuditLog({ startDate: 'gibberish' }),
      ).rejects.toThrow('Invalid startDate');
    });

    it('rejects an invalid endDate with BadRequestException', async () => {
      await expect(
        service.getAuditLog({ endDate: 'gibberish' }),
      ).rejects.toThrow('Invalid endDate');
    });
  });
});