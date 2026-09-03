import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * clock_audit_entries — immutable, append-only audit log untuk setiap
 * clock-in / clock-out. Write-only di-enforce di level database via trigger
 * yang memblokir UPDATE dan DELETE (idempotent).
 */
export class CreateClockAuditEntries1756100000000 implements MigrationInterface {
  name = 'CreateClockAuditEntries1756100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== Table (idempotent) =====
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clock_audit_entries" (
        "id" uuid PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "action" varchar(20) NOT NULL,
        "event_timestamp" timestamp with time zone NOT NULL,
        "original_timestamp" timestamp with time zone NOT NULL,
        "source_client_type" varchar(30) NOT NULL,
        "device_identifier" varchar(255),
        "ip_address" varchar(45),
        "outcome" varchar(10) NOT NULL,
        "failure_reason" varchar(255),
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      )
    `);

    // ===== Indexes (idempotent) =====
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_CLOCK_AUDIT_ENTRIES_USER_ID" ON "clock_audit_entries" USING btree ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_CLOCK_AUDIT_ENTRIES_EVENT_TIMESTAMP" ON "clock_audit_entries" USING btree ("event_timestamp")`,
    );

    // ===== Append-only enforcement (idempotent) =====
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION clock_audit_entries_write_only() RETURNS trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RAISE EXCEPTION 'clock_audit_entries is append-only: UPDATE and DELETE are not allowed';
      END;
      $$
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS "trg_clock_audit_entries_write_only" ON "clock_audit_entries"
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_clock_audit_entries_write_only"
      BEFORE UPDATE OR DELETE ON "clock_audit_entries"
      FOR EACH ROW EXECUTE FUNCTION clock_audit_entries_write_only()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_clock_audit_entries_write_only" ON "clock_audit_entries"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS clock_audit_entries_write_only()`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clock_audit_entries"`);
  }
}