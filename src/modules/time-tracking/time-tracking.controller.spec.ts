import { Test } from '@nestjs/testing';
import type { FastifyRequest } from 'fastify';
import { TimeTrackingController } from './time-tracking.controller';
import { TimeTrackingService } from './time-tracking.service';

describe('TimeTrackingController', () => {
  let controller: TimeTrackingController;
  let service: { recordClockAction: jest.Mock; getAuditLog: jest.Mock };

  const user = { userId: 11, email: 'emp@example.com', roles: ['USER'], developerMode: false };

  beforeEach(async () => {
    service = {
      recordClockAction: jest.fn(),
      getAuditLog: jest.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [TimeTrackingController],
      providers: [{ provide: TimeTrackingService, useValue: service }],
    }).compile();

    controller = moduleRef.get(TimeTrackingController);
  });

  it('POST /clock records an audit entry for the authenticated user with request IP fallback', async () => {
    const expectedEntry = { id: 'audit-1', outcome: 'SUCCESS', action: 'CLOCK_IN' };
    service.recordClockAction.mockResolvedValue(expectedEntry);

    const request = { ip: '203.0.113.7', headers: {} } as unknown as FastifyRequest;
    const result = await controller.clock(
      user as never,
      { action: 'CLOCK_IN', sourceClientType: 'mobile' } as never,
      request,
    );

    expect(service.recordClockAction).toHaveBeenCalledTimes(1);
    expect(service.recordClockAction).toHaveBeenCalledWith({
      userId: 11,
      action: 'CLOCK_IN',
      originalTimestamp: undefined,
      sourceClientType: 'mobile',
      deviceIdentifier: null,
      ipAddress: '203.0.113.7',
    });
    expect(result).toBe(expectedEntry);
  });

  it('POST /clock prefers client-supplied ipAddress over the request IP', async () => {
    service.recordClockAction.mockResolvedValue({ id: 'audit-2' });

    const request = { ip: '203.0.113.7', headers: {} } as unknown as FastifyRequest;
    await controller.clock(
      user as never,
      { action: 'CLOCK_OUT', ipAddress: '198.51.100.9' } as never,
      request,
    );

    expect(service.recordClockAction).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: '198.51.100.9' }),
    );
  });

  it('GET /audit-log queries the log with user id and date range filters', async () => {
    const rows = [{ id: 'audit-1' }];
    service.getAuditLog.mockResolvedValue(rows);

    const query = {
      userId: 11,
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.000Z',
    };
    const result = await controller.auditLog(query as never);

    expect(service.getAuditLog).toHaveBeenCalledWith(query);
    expect(result).toBe(rows);
  });
});