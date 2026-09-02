import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const PERMISSION_CODE_PATTERN = /^[a-z0-9]+(?:[:._-][a-z0-9]+)*$/;

export class CreatePermissionDto {
  @ApiProperty({ example: 'laporan:approve', description: 'Kode unik permission (resource:action)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(PERMISSION_CODE_PATTERN, {
    message: 'Kode permission hanya boleh huruf kecil, angka, dan pemisah : . _ -',
  })
  code!: string;

  @ApiProperty({ example: 'Approve Laporan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ required: false, example: 'Menyetujui laporan yang masuk' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}

export class AssignPermissionDto {
  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  permissionId!: number;
}