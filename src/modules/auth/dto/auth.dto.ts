import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Budi Santoso', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;
}

export class AuthUserDto {
  @ApiProperty()
  userId!: number;

  @ApiProperty()
  email!: string;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ description: 'Developer Mode aktif (dari DB user)' })
  developerMode!: boolean;
}
