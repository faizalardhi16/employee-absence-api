import { Controller, Get, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { EnvConfig } from '../../config/env/env.config';
import { Public } from '../auth/decorators/auth.decorators';
import { CSRF_TOKEN_TTL_SECONDS } from './csrf.constants';
import { CsrfService } from './csrf.service';

export interface CsrfTokenResponse {
  csrfToken: string;
}

/**
 * CsrfController — endpoint issue token CSRF.
 * Frontend memanggil GET ini sekali (atau saat token hilang) untuk mendapat
 * cookie `csrf_token` + nilai token yang sama (dikirim balik via header).
 * SOLID: controller cuma routing; logic token di CsrfService.
 */
@ApiTags('CSRF')
@Controller('csrf')
export class CsrfController {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly config: EnvConfig,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Issue CSRF token: set cookie (JS-readable) dan kembalikan token',
  })
  issue(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): CsrfTokenResponse {
    // Reuse cookie yang masih valid — hindari race antar tab yang
    // masing-masing meminta token baru (cookie terakhir menang → header tab lain basi).
    const existing = request.cookies?.[this.config.csrfCookieName];
    const csrfToken =
      existing && this.csrfService.verifyToken(existing)
        ? existing
        : this.csrfService.generateToken();

    if (csrfToken !== existing) {
      reply.setCookie(this.config.csrfCookieName, csrfToken, {
        // Harus non-HttpOnly agar JS frontend bisa baca → header X-CSRF-Token.
        httpOnly: false,
        secure: this.config.cookieSecure,
        sameSite: this.config.cookieSameSite,
        path: '/',
        maxAge: CSRF_TOKEN_TTL_SECONDS,
      });
    }

    return { csrfToken };
  }
}