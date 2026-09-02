import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, AuthUser } from '../decorators/auth.decorators';
import { UsersService } from '../users.service';

/**
 * PermissionsGuard — RBAC enforcement setelah JwtAuthGuard.
 * Ambil metadata @RequirePermissions(), cek permission efektif user dari DB.
 * Route tanpa metadata permission langsung lolos (tanpa query).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (!user) throw new UnauthorizedException('Belum ter-autentikasi');

    const owned = await this.usersService.getPermissionCodes(user.userId);
    const missing = required.filter((permission) => !owned.includes(permission));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Permission tidak mencukupi: ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
