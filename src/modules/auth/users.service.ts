import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import {
  UarPermission,
  UarRole,
  UarRolePermissionMap,
  UarUser,
  UarUserRoleMap,
} from '../../database/entities';

export interface AuthenticatedUser {
  user: UarUser;
  roles: string[];
}

/**
 * UsersService — semua akses DB ke tabel UAR_* untuk auth & RBAC.
 * SOLID: satu concern — persistensi/query user-role-permission.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UarUser) private readonly usersRepo: Repository<UarUser>,
    @InjectRepository(UarRole) private readonly rolesRepo: Repository<UarRole>,
    @InjectRepository(UarPermission)
    private readonly permissionsRepo: Repository<UarPermission>,
    @InjectRepository(UarUserRoleMap)
    private readonly userRoleMapRepo: Repository<UarUserRoleMap>,
    @InjectRepository(UarRolePermissionMap)
    private readonly rolePermissionMapRepo: Repository<UarRolePermissionMap>,
  ) {}

  /** Registrasi user baru: hash password + assign role default USER. */
  async registerUser(input: {
    email: string;
    password: string;
    name?: string;
  }): Promise<UarUser> {
    const existing = await this.usersRepo.findOneBy({ EMAIL: input.email });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hash = await bcrypt.hash(input.password, 10);
    const user = await this.usersRepo.save({
      EMAIL: input.email,
      NAME: input.name ?? null,
      PASSWORD_HASH: hash,
    });

    await this.assignRole(user.ID, 'USER');
    return user;
  }

  /** Assign role ke user berdasarkan kode role (idempotent). */
  async assignRole(userId: number, roleCode: string): Promise<void> {
    const role = await this.rolesRepo.findOneBy({ CODE: roleCode });
    if (!role) {
      throw new NotFoundException(`Role '${roleCode}' tidak ditemukan`);
    }

    await this.userRoleMapRepo
      .createQueryBuilder()
      .insert()
      .orIgnore()
      .values({ USER_ID: userId, ROLE_ID: role.ID })
      .execute();
  }

  /** Validasi kredensial: cari user aktif lalu cocokkan bcrypt hash. */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepo.findOneBy({
      EMAIL: email,
      IS_ACTIVE: true,
    });
    if (!user) return null;

    const match = await bcrypt.compare(password, user.PASSWORD_HASH);
    if (!match) return null;

    return { user, roles: await this.getRoleCodes(user.ID) };
  }

  /** Status Developer Mode user (sumber kebenaran = DB). */
  async getDeveloperMode(userId: number): Promise<boolean> {
    const user = await this.usersRepo.findOneBy({ ID: userId });
    return user?.DEVELOPER_MODE ?? false;
  }

  /** Kode-kode role milik user. */
  async getRoleCodes(userId: number): Promise<string[]> {
    const rows = await this.userRoleMapRepo
      .createQueryBuilder('map')
      .innerJoin(UarRole, 'role', 'role.ID = map.ROLE_ID')
      .select('role.CODE', 'CODE')
      .where('map.USER_ID = :userId', { userId })
      .getRawMany<{ CODE: string }>();
    return rows.map((row) => row.CODE);
  }

  /** Kode-kode permission efektif user (gabungan dari semua role-nya). */
  async getPermissionCodes(userId: number): Promise<string[]> {
    const rows = await this.userRoleMapRepo
      .createQueryBuilder('map')
      .innerJoin(
        UarRolePermissionMap,
        'rpm',
        'rpm.ROLE_ID = map.ROLE_ID',
      )
      .innerJoin(UarPermission, 'perm', 'perm.ID = rpm.PERMISSION_ID')
      .select('perm.CODE', 'CODE')
      .distinct(true)
      .where('map.USER_ID = :userId', { userId })
      .getRawMany<{ CODE: string }>();
    return rows.map((row) => row.CODE);
  }

  /** Daftar user (demo endpoint RBAC). */
  async listUsers(): Promise<
    Array<{ ID: number; EMAIL: string; NAME: string | null; IS_ACTIVE: boolean }>
  > {
    const users = await this.usersRepo.find({
      select: { ID: true, EMAIL: true, NAME: true, IS_ACTIVE: true },
      order: { ID: 'ASC' },
    });
    return users;
  }

  // ================= Permission management =================

  /** Semua permission master, urut kode. */
  async listPermissions(): Promise<UarPermission[]> {
    return this.permissionsRepo.find({ order: { CODE: 'ASC' } });
  }

  /** Daftar role beserta kode permission yang sudah diberikan. */
  async listRoles(): Promise<
    Array<{
      ID: number;
      CODE: string;
      NAME: string;
      DESCRIPTION: string | null;
      permissions: string[];
    }>
  > {
    const roles = await this.rolesRepo.find({ order: { ID: 'ASC' } });

    const maps = await this.rolePermissionMapRepo
      .createQueryBuilder('map')
      .innerJoin(UarPermission, 'perm', 'perm.ID = map.PERMISSION_ID')
      .select('map.ROLE_ID', 'ROLE_ID')
      .addSelect('perm.CODE', 'CODE')
      .getRawMany<{ ROLE_ID: number; CODE: string }>();

    const permissionsByRole = new Map<number, string[]>();
    for (const map of maps) {
      const codes = permissionsByRole.get(map.ROLE_ID) ?? [];
      codes.push(map.CODE);
      permissionsByRole.set(map.ROLE_ID, codes);
    }

    return roles.map((role) => ({
      ...role,
      permissions: permissionsByRole.get(role.ID) ?? [],
    }));
  }

  /** Tambah permission baru (code unik). */
  async createPermission(input: {
    code: string;
    name: string;
    description?: string;
  }): Promise<UarPermission> {
    const existing = await this.permissionsRepo.findOneBy({ CODE: input.code });
    if (existing) {
      throw new ConflictException(`Permission '${input.code}' sudah ada`);
    }

    return this.permissionsRepo.save({
      CODE: input.code,
      NAME: input.name,
      DESCRIPTION: input.description ?? null,
    });
  }

  /** Berikan permission ke role (idempotent). */
  async assignPermissionToRole(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    await this.ensureRoleExists(roleId);
    await this.ensurePermissionExists(permissionId);

    await this.rolePermissionMapRepo
      .createQueryBuilder()
      .insert()
      .orIgnore()
      .values({ ROLE_ID: roleId, PERMISSION_ID: permissionId })
      .execute();
  }

  /** Lepas permission dari role (idempotent). */
  async unassignPermissionFromRole(
    roleId: number,
    permissionId: number,
  ): Promise<void> {
    await this.rolePermissionMapRepo.delete({
      ROLE_ID: roleId,
      PERMISSION_ID: permissionId,
    });
  }

  private async ensureRoleExists(roleId: number): Promise<void> {
    const role = await this.rolesRepo.findOneBy({ ID: roleId });
    if (!role) {
      throw new NotFoundException(`Role ID ${roleId} tidak ditemukan`);
    }
  }

  private async ensurePermissionExists(permissionId: number): Promise<void> {
    const permission = await this.permissionsRepo.findOneBy({
      ID: permissionId,
    });
    if (!permission) {
      throw new NotFoundException(`Permission ID ${permissionId} tidak ditemukan`);
    }
  }
}