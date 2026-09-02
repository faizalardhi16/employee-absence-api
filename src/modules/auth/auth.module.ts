import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EnvConfig } from '../../config/env/env.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RbacController } from './rbac.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * AuthModule — JWT auth via HttpOnly cookie + RBAC (UAR_* tables).
 * SOLID: module ini urus semua concern auth (service, strategy, controller).
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [EnvConfig],
      useFactory: (config: EnvConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresIn },
      }),
    }),
  ],
  controllers: [AuthController, UsersController, RbacController],
  providers: [AuthService, JwtStrategy, UsersService],
  exports: [AuthService, UsersService],
})
export class AuthModule {}
