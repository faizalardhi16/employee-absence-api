import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * clock_audit_entries — immutable, append-only audit log of every clock-in /
 * clock-out attempt. One row per clock action request (success OR failure).
 *
 * Write-only semantics (no UPDATE/DELETE) are enforced at the database level
 * by the trigger `trg_clock_audit_entries_write_only` (see migration
 * 1756100000000-CreateClockAuditEntries) and by the fact that no update/delete
 * endpoint or repository method is exposed anywhere in the app.
 */
@Entity({ name: 'clock_audit_entries' })
@Index('IDX_CLOCK_AUDIT_ENTRIES_USER_ID', ['userId'])
@Index('IDX_CLOCK_AUDIT_ENTRIES_EVENT_TIMESTAMP', ['eventTimestamp'])
export class ClockAuditEntry {
  /** Unique audit entry ID (uuid, generated server-side). */
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  /** ID of the user who triggered the clock action. */
  @Column({ type: 'int', name: 'user_id' })
  userId!: number;

  /** CLOCK_IN | CLOCK_OUT */
  @Column({ type: 'varchar', length: 20, name: 'action' })
  action!: string;

  /** Server event timestamp (UTC ISO 8601). */
  @Column({ type: 'timestamp with time zone', name: 'event_timestamp' })
  eventTimestamp!: Date;

  /** Original clock timestamp supplied by the client, else = eventTimestamp. */
  @Column({ type: 'timestamp with time zone', name: 'original_timestamp' })
  originalTimestamp!: Date;

  /** Source client type: web | mobile | time_terminal */
  @Column({ type: 'varchar', length: 30, name: 'source_client_type' })
  sourceClientType!: string;

  /** Device identifier when available. */
  @Column({ type: 'varchar', length: 255, name: 'device_identifier', nullable: true })
  deviceIdentifier!: string | null;

  /** IP address when available. */
  @Column({ type: 'varchar', length: 45, name: 'ip_address', nullable: true })
  ipAddress!: string | null;

  /** SUCCESS | FAILURE */
  @Column({ type: 'varchar', length: 10, name: 'outcome' })
  outcome!: string;

  /** Failure reason for FAILURE entries (e.g. invalid timestamp). */
  @Column({ type: 'varchar', length: 255, name: 'failure_reason', nullable: true })
  failureReason!: string | null;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt!: Date;
}