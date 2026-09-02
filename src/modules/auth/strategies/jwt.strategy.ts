import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FastifyRequest } from 'fastify';
import { EnvConfig } from '../../../config/env/env.config';
import { AuthUser } from '../decorators/auth.decorators';

export interface JwtPayload {
  sub: number;
  email: string;
  roles?: string[];
  developerMode?: boolean;
}

/**
 * JwtStrategy — verify JWT, ambil credential dari HttpOnly cookie (bukan header).
 * SOLID: strategi cuma satu job — terjemah cookie -> AuthUser.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: EnvConfig) {
    const extractFromCookie = (req: FastifyRequest): string | null => {
      const token = req.cookies?.[config.cookieName];
      return token ?? null;
    };
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractFromCookie]),
      ignoreExpiration: false,
      secretOrKey: config.jwtSecret,
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
      developerMode: payload.developerMode ?? false,
    };
  }
}
