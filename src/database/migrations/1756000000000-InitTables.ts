import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Inisialisasi tabel UAR_* (RBAC) + datastore_records, plus kolom
 * DEVELOPER_MODE di UAR_USERS.
 * Idempotent: aman dijalankan di DB baru maupun DB yang sudah dibuat
 * sebelumnya oleh migrasi Drizzle (CREATE ... IF NOT EXISTS).
 */
export class InitTables1756000000000 implements MigrationInterface {
  name = 'InitTables1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Tables (idempotent) =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "datastore_records" (
        "id" serial PRIMARY KEY NOT NULL,
        "item_key" varchar(120) NOT NULL,
        "value" varchar(5000) NOT NULL,
        "meta" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "datastore_records_item_key_unique" UNIQUE("item_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "UAR_PERMISSIONS" (
        "ID" serial PRIMARY KEY NOT NULL,
        "CODE" varchar(100) NOT NULL,
        "NAME" varchar(100) NOT NULL,
        "DESCRIPTION" text,
        CONSTRAINT "UAR_PERMISSIONS_CODE_unique" UNIQUE("CODE")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "UAR_ROLE_PERMISSION_MAP" (
        "ID" serial PRIMARY KEY NOT NULL,
        "ROLE_ID" integer NOT NULL,
        "PERMISSION_ID" integer NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "UAR_ROLES" (
        "ID" serial PRIMARY KEY NOT NULL,
        "CODE" varchar(50) NOT NULL,
        "NAME" varchar(100) NOT NULL,
        "DESCRIPTION" text,
        CONSTRAINT "UAR_ROLES_CODE_unique" UNIQUE("CODE")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "UAR_USER_ROLE_MAP" (
        "ID" serial PRIMARY KEY NOT NULL,
        "USER_ID" integer NOT NULL,
        "ROLE_ID" integer NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "UAR_USERS" (
        "ID" serial PRIMARY KEY NOT NULL,
        "EMAIL" varchar(255) NOT NULL,
        "NAME" varchar(255),
        "PASSWORD_HASH" varchar(255) NOT NULL,
        "IS_ACTIVE" boolean DEFAULT true NOT NULL,
        "DEVELOPER_MODE" boolean DEFAULT false NOT NULL,
        "CREATED_AT" timestamp with time zone DEFAULT now() NOT NULL,
        "UPDATED_AT" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "UAR_USERS_EMAIL_unique" UNIQUE("EMAIL")
      )
    `);

    // ===== Foreign keys (idempotent via DO block) =====
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "UAR_ROLE_PERMISSION_MAP" ADD CONSTRAINT "UAR_ROLE_PERMISSION_MAP_ROLE_ID_UAR_ROLES_ID_fk"
        FOREIGN KEY ("ROLE_ID") REFERENCES "public"."UAR_ROLES"("ID") ON DELETE cascade ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "UAR_ROLE_PERMISSION_MAP" ADD CONSTRAINT "UAR_ROLE_PERMISSION_MAP_PERMISSION_ID_UAR_PERMISSIONS_ID_fk"
        FOREIGN KEY ("PERMISSION_ID") REFERENCES "public"."UAR_PERMISSIONS"("ID") ON DELETE cascade ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "UAR_USER_ROLE_MAP" ADD CONSTRAINT "UAR_USER_ROLE_MAP_USER_ID_UAR_USERS_ID_fk"
        FOREIGN KEY ("USER_ID") REFERENCES "public"."UAR_USERS"("ID") ON DELETE cascade ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "UAR_USER_ROLE_MAP" ADD CONSTRAINT "UAR_USER_ROLE_MAP_ROLE_ID_UAR_ROLES_ID_fk"
        FOREIGN KEY ("ROLE_ID") REFERENCES "public"."UAR_ROLES"("ID") ON DELETE cascade ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$
    `);

    // ===== Indexes (idempotent) =====
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_UAR_ROLE_PERMISSION_MAP" ON "UAR_ROLE_PERMISSION_MAP" USING btree ("ROLE_ID","PERMISSION_ID")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_UAR_ROLE_PERMISSION_MAP_PERMISSION_ID" ON "UAR_ROLE_PERMISSION_MAP" USING btree ("PERMISSION_ID")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_UAR_USER_ROLE_MAP" ON "UAR_USER_ROLE_MAP" USING btree ("USER_ID","ROLE_ID")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_UAR_USER_ROLE_MAP_ROLE_ID" ON "UAR_USER_ROLE_MAP" USING btree ("ROLE_ID")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_UAR_USERS_EMAIL" ON "UAR_USERS" USING btree ("EMAIL")`,
    );

    // ===== Developer Mode column (idempotent) =====
    await queryRunner.query(
      `ALTER TABLE "UAR_USERS" ADD COLUMN IF NOT EXISTS "DEVELOPER_MODE" boolean DEFAULT false NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "UAR_USER_ROLE_MAP"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "UAR_ROLE_PERMISSION_MAP"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "UAR_PERMISSIONS"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "UAR_ROLES"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "UAR_USERS"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "datastore_records"`);
  }
}