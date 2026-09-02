import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from './decorators/auth.decorators';
import { UsersService } from './users.service';

/**
 * UsersController — demo pemakaian RBAC: route butuh permission user:read.
 * SOLID: controller cuma routing; logic ada di UsersService.
 */
@ApiTags('Users')
@ApiCookieAuth()
@RequirePermissions('user:read')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar user (butuh permission user:read)' })
  async findAll() {
    return this.usersService.listUsers();
  }
}
