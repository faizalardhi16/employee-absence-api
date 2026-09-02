import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Entitas RBAC (Role-Based Access Control) dengan prefix UAR_.
 * Semua nama tabel & kolom UPPERCASE (di-quote otomatis oleh TypeORM).
 * SOLID: entitas = murni definisi tabel, tanpa logic.
 */

/** UAR_USERS — akun pengguna untuk autentikasi. */
@Entity({ name: 'UAR_USERS' })
@Index('IDX_UAR_USERS_EMAIL', ['EMAIL'])
export class UarUser {
  @PrimaryGeneratedColumn({ type: 'int', name: 'ID' })
  ID!: number;

  @Column({ type: 'varchar', length: 255, name: 'EMAIL', unique: true })
  EMAIL!: string;

  @Column({ type: 'varchar', length: 255, name: 'NAME', nullable: true })
  NAME!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'PASSWORD_HASH' })
  PASSWORD_HASH!: string;

  @Column({ type: 'boolean', name: 'IS_ACTIVE', default: true })
  IS_ACTIVE!: boolean;

  /** Developer Mode — mengaktifkan tool dev (mis. Request/Response Log) di UI. */
  @Column({ type: 'boolean', name: 'DEVELOPER_MODE', default: false })
  DEVELOPER_MODE!: boolean;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'CREATED_AT',
    default: () => 'now()',
  })
  CREATED_AT!: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    name: 'UPDATED_AT',
    default: () => 'now()',
  })
  UPDATED_AT!: Date;
}

/** UAR_ROLES — master role (ADMIN, USER, dsb). */
@Entity({ name: 'UAR_ROLES' })
export class UarRole {
  @PrimaryGeneratedColumn({ type: 'int', name: 'ID' })
  ID!: number;

  @Column({ type: 'varchar', length: 50, name: 'CODE', unique: true })
  CODE!: string;

  @Column({ type: 'varchar', length: 100, name: 'NAME' })
  NAME!: string;

  @Column({ type: 'text', name: 'DESCRIPTION', nullable: true })
  DESCRIPTION!: string | null;
}

/** UAR_PERMISSIONS — master permission granular (mis. user:create). */
@Entity({ name: 'UAR_PERMISSIONS' })
export class UarPermission {
  @PrimaryGeneratedColumn({ type: 'int', name: 'ID' })
  ID!: number;

  @Column({ type: 'varchar', length: 100, name: 'CODE', unique: true })
  CODE!: string;

  @Column({ type: 'varchar', length: 100, name: 'NAME' })
  NAME!: string;

  @Column({ type: 'text', name: 'DESCRIPTION', nullable: true })
  DESCRIPTION!: string | null;
}

/** UAR_USER_ROLE_MAP — relasi many-to-many user <-> role. */
@Entity({ name: 'UAR_USER_ROLE_MAP' })
@Unique('UQ_UAR_USER_ROLE_MAP', ['USER_ID', 'ROLE_ID'])
@Index('IDX_UAR_USER_ROLE_MAP_ROLE_ID', ['ROLE_ID'])
export class UarUserRoleMap {
  @PrimaryGeneratedColumn({ type: 'int', name: 'ID' })
  ID!: number;

  @Column({ type: 'int', name: 'USER_ID' })
  USER_ID!: number;

  @Column({ type: 'int', name: 'ROLE_ID' })
  ROLE_ID!: number;
}

/** UAR_ROLE_PERMISSION_MAP — relasi many-to-many role <-> permission. */
@Entity({ name: 'UAR_ROLE_PERMISSION_MAP' })
@Unique('UQ_UAR_ROLE_PERMISSION_MAP', ['ROLE_ID', 'PERMISSION_ID'])
@Index('IDX_UAR_ROLE_PERMISSION_MAP_PERMISSION_ID', ['PERMISSION_ID'])
export class UarRolePermissionMap {
  @PrimaryGeneratedColumn({ type: 'int', name: 'ID' })
  ID!: number;

  @Column({ type: 'int', name: 'ROLE_ID' })
  ROLE_ID!: number;

  @Column({ type: 'int', name: 'PERMISSION_ID' })
  PERMISSION_ID!: number;
}