import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * ClockActionDto — payload untuk submit clock-in / clock-out.
 *
 * Semua field sengaja optional + validasi semantik dilakukan di service.
 * Tujuannya: SETIAP request clock action (valid ataupun invalid) harus
 * menghasilkan persis satu entri audit (outcome SUCCESS/FAILURE), sesuai
 * requirement append-only audit log.
 */
export class ClockActionDto {
  @ApiProperty({
    enum: ['CLOCK_IN', 'CLOCK_OUT'],
    description: 'Jenis aksi clock. Nilai lain => entri FAILURE (invalid action type).',
    required: false,
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({
    description:
      'Timestamp asli dari client (UTC ISO 8601). Jika tidak diberikan, server receipt time dipakai untuk event & original timestamp.',
    required: false,
    example: '2026-09-03T08:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  originalTimestamp?: string;

  @ApiProperty({
    enum: ['web', 'mobile', 'time_terminal'],
    description: 'Sumber client. Default: web.',
    required: false,
    default: 'web',
  })
  @IsOptional()
  @IsString()
  sourceClientType?: string;

  @ApiProperty({
    description: 'Identitas perangkat jika tersedia.',
    required: false,
  })
  @IsOptional()
  @IsString()
  deviceIdentifier?: string;

  @ApiProperty({
    description: 'Alamat IP jika disediakan client. Default: IP dari request.',
    required: false,
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}