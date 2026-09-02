import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EnvConfig } from '../../config/env/env.config';
import { UsersService } from './users.service';
import { AuthenticatedUser } from './users.service';
import { JwtPayload } from './strategies/jwt.strategy';

export interface LoginResponse {
  accessToken: string;
  user: {
    userId: number;
    email: string;
    name: string | null;
    roles: string[];
    developerMode: boolean;
  };
}

/**
 * AuthService — urus login/logout & token lifecycle.
 * SOLID: cuma business logic auth; akses DB didelegasikan ke UsersService.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: EnvConfig,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Login: validasi kredensial ke UAR_USERS (bcrypt), lalu terbitkan JWT
   * berisi sub/email/roles (HttpOnly cookie diset di controller).
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const authenticated = await this.validateUser(email, password);
    if (!authenticated) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const { user, roles } = authenticated;
    const accessToken = await this.createToken(
      user.ID,
      user.EMAIL,
      roles,
      user.DEVELOPER_MODE,
    );
    return {
      accessToken,
      user: {
        userId: user.ID,
        email: user.EMAIL,
        name: user.NAME,
        roles,
        developerMode: user.DEVELOPER_MODE,
      },
    };
  }

  /** Validasi kredensial mentah (dipakai login & test). */
  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    return this.usersService.validateCredentials(email, password);
  }

  /** Generate access token dari payload (dipakai setelah login valid). */
  createToken(
    userId: number,
    email: string,
    roles: string[] = [],
    developerMode = false,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      roles,
      developerMode,
    });
  }

  /** Verify token (dipakai saat butuh paksa re-validasi). */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token invalid atau sudah kadaluarsa');
    }
  }
}
