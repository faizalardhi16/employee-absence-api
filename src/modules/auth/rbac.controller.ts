import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from './decorators/auth.decorators';
import { AssignPermissionDto, CreatePermissionDto } from './dto/rbac.dto';
import { UsersService } from './users.service';

/**
 * RbacController — manajemen permission & role assignment.
 * SOLID: controller cuma routing; logic ada di UsersService.
 */
@ApiTags('RBAC')
@ApiCookieAuth()
@Controller()
export class RbacController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'Daftar role beserta permission yang dimiliki' })
  listRoles() {
    return this.usersService.listRoles();
  }

  @Get('permissions')
  @RequirePermissions('role:read')
  @ApiOperation({ summary: 'Daftar semua permission master' })
  listPermissions() {
    return this.usersService.listPermissions();
  }

  @Post('permissions')
  @RequirePermissions('permission:create')
  @ApiOperation({ summary: 'Tambah permission baru' })
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.usersService.createPermission(dto);
  }

  @Post('roles/:roleId/permissions')
  @RequirePermissions('role:assign')
  @ApiOperation({ summary: 'Berikan permission ke role (idempotent)' })
  async assignPermission(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Body() dto: AssignPermissionDto,
  ) {
    await this.usersService.assignPermissionToRole(roleId, dto.permissionId);
    return { success: true };
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @RequirePermissions('role:assign')
  @ApiOperation({ summary: 'Lepas permission dari role (idempotent)' })
  async unassignPermission(
    @Param('roleId', ParseIntPipe) roleId: number,
    @Param('permissionId', ParseIntPipe) permissionId: number,
  ) {
    await this.usersService.unassignPermissionFromRole(roleId, permissionId);
    return { success: true };
  }
}