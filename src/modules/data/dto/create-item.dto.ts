import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO untuk create record ke MongoDB / Redis / PostgreSQL.
 * SOLID: satu DTO = satu kontrak input. Dipakai bareng 3 store biar API konsisten.
 */
export class CreateItemDto {
  @ApiProperty({
    description: 'Key/identifier unik item (Redis key, Mongo _id override optional, PG unique key)',
    example: 'kucing-01',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  key!: string;

  @ApiProperty({
    description: 'Nilai/value item (bebas string)',
    example: 'Ini item percobaan ke-1',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  value!: string;

  @ApiPropertyOptional({
    description: 'Metadata tambahan (opsional)',
    example: { source: 'telegram-demo' },
  })
  @IsOptional()
  meta?: Record<string, unknown>;
}
