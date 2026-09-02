import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

/**
 * Tabel demo CRUD untuk PostgreSQL (via TypeORM).
 * SOLID: entitas = definisi tabel murni tanpa logic.
 */
@Entity({ name: 'datastore_records' })
@Unique('datastore_records_item_key_unique', ['itemKey'])
export class DataStoreRecord {
  @PrimaryGeneratedColumn({ type: 'int', name: 'id' })
  id!: number;

  @Column({ type: 'varchar', length: 120, name: 'item_key' })
  itemKey!: string;

  @Column({ type: 'varchar', length: 5000, name: 'value' })
  value!: string;

  @Column({ type: 'jsonb', name: 'meta', nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    default: () => 'now()',
  })
  createdAt!: Date;
}