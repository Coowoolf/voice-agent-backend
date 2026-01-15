// src/database/migrations/002_create_call_sessions_table.ts
import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateCallSessionsTable1705300100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'call_sessions',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'user_id', type: 'uuid' },
                    { name: 'trigger_type', type: 'enum', enum: ['decision', 'error', 'completion'] },
                    { name: 'trigger_context', type: 'jsonb' },
                    { name: 'agora_call_id', type: 'varchar', isNullable: true },
                    { name: 'phone_number', type: 'varchar' },
                    { name: 'status', type: 'enum', enum: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'missed'] },
                    { name: 'conversation', type: 'jsonb', default: "'[]'" },
                    { name: 'user_decision', type: 'jsonb', isNullable: true },
                    { name: 'duration_seconds', type: 'int', isNullable: true },
                    { name: 'started_at', type: 'timestamp', isNullable: true },
                    { name: 'ended_at', type: 'timestamp', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'now()' }
                ]
            })
        );

        await queryRunner.createIndex('call_sessions', new TableIndex({ name: 'idx_call_sessions_user_id', columnNames: ['user_id'] }));
        await queryRunner.createIndex('call_sessions', new TableIndex({ name: 'idx_call_sessions_status', columnNames: ['status'] }));
        await queryRunner.createIndex('call_sessions', new TableIndex({ name: 'idx_call_sessions_created_at', columnNames: ['created_at'] }));

        await queryRunner.createForeignKey('call_sessions', new TableForeignKey({
            columnNames: ['user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'CASCADE'
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('call_sessions');
    }
}
