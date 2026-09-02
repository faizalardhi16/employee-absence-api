import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { EnvConfig } from '../../config/env/env.config';
import {
  CSRF_INVALID_MESSAGE,
  SAFE_HTTP_METHODS,
  SKIP_CSRF_KEY,
} from './csrf.constants';
import { CsrfService } from './csrf.service';

/**
 * CsrfGuard — proteksi CSRF global untuk semua metode yang mengubah state
 * (POST/PUT/PATCH/DELETE).
 *
 * Pola double-submit cookie:
 *  - cookie `csrf_token` (non-HttpOnly, dibaca JS) → header `X-CSRF-Token`
 *  - guard mengecek: cookie ada, header ada, nilai sama, DAN signature HMAC valid
 *
 * Serangan CSRF lintas-origin gagal karena attacker tidak bisa membaca cookie
 * (Same-Origin Policy) ataupun mengirim custom header (CORS preflight).
 * SOLID: guard cuma urus gate CSRF.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly csrfService: CsrfService,
    private readonly config: EnvConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = (request.method ?? 'GET').toUpperCase();

    // Metode aman (tidak mengubah state) tidak butuh token.
    if (SAFE_HTTP_METHODS.has(method)) return true;

    // Route yang eksplisit di-@SkipCsrf() dilewati.
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipCsrf) return true;

    const cookieToken = request.cookies?.[this.config.csrfCookieName];
    const rawHeader = request.headers[this.config.csrfHeaderName];
    const headerToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;

    const valid =
      !!cookieToken &&
      !!headerToken &&
      cookieToken === headerToken &&
      this.csrfService.verifyToken(headerToken);

    if (!valid) {
      throw new ForbiddenException(CSRF_INVALID_MESSAGE);
    }
    return true;
  }
}