import {
  Body,
  Controller,
  Get,
  Post,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { EnvConfig } from '../../config/env/env.config';
import {
  AuthUser,
  CurrentUser,
  Public,
} from './decorators/auth.decorators';
import { AuthUserDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';

/**
 * AuthController — HTTP endpoint untuk register/login/logout & profil.
 * SOLID: controller cuma routing; logic ada di AuthService/UsersService.
 */
@ApiTags('Auth')
@ApiCookieAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly config: EnvConfig,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Registrasi user baru (role default USER)' })
  async register(@Body() dto: RegisterDto): Promise<AuthUserDto> {
    const user = await this.usersService.registerUser(dto);
    return {
      userId: user.ID,
      email: user.EMAIL,
      roles: ['USER'],
      developerMode: user.DEVELOPER_MODE,
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login, set JWT ke HttpOnly cookie' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthUserDto> {
    const { accessToken, user } = await this.authService.login(dto.email, dto.password);

    reply.setCookie(this.config.cookieName, accessToken, {
      httpOnly: this.config.cookieHttpOnly,
      secure: this.config.cookieSecure,
      sameSite: this.config.cookieSameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
      developerMode: user.developerMode,
    };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout, hapus cookie' })
  async logout(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ success: boolean }> {
    reply.clearCookie(this.config.cookieName, { path: '/' });
    return { success: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Profil user yang login (dari cookie JWT + live DB)' })
  async me(@CurrentUser() user: AuthUser): Promise<AuthUserDto> {
    const developerMode = await this.usersService.getDeveloperMode(user.userId);
    return {
      userId: user.userId,
      email: user.email,
      roles: user.roles,
      developerMode,
    };
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Permission efektif user yang login (live dari DB)' })
  async permissions(@CurrentUser() user: AuthUser): Promise<string[]> {
    return this.usersService.getPermissionCodes(user.userId);
  }
}
