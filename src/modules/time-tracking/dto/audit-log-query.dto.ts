import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * AuditLogQueryDto — filter read-only query audit log.
 * Hasil selalu dikembalikan urut kronologis (event_timestamp ASC, id ASC).
 */
export class AuditLogQueryDto {
  @ApiProperty({
    description: 'Filter berdasarkan user ID.',
    required: false,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @ApiProperty({
    description: 'Awal rentang tanggal (UTC ISO 8601), inklusif.',
    required: false,
    example: '2026-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'Akhir rentang tanggal (UTC ISO 8601), inklusif.',
    required: false,
    example: '2026-09-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}