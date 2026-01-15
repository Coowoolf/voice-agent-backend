// src/database/migrations/001_create_users_table.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateUsersTable1705300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable uuid extension
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        await queryRunner.createTable(
            new Table({
                name: 'users',
                columns: [
                    { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                    { name: 'email', type: 'varchar', isUnique: true },
                    { name: 'phone_number_encrypted', type: 'text' },
                    { name: 'language', type: 'varchar', length: '10' },
                    { name: 'timezone', type: 'varchar', isNullable: true },
                    { name: 'plan', type: 'enum', enum: ['free', 'pro', 'enterprise'], default: "'free'" },
                    { name: 'monthly_quota', type: 'int', default: 10 },
                    { name: 'quota_used', type: 'int', default: 0 },
                    { name: 'quota_reset_at', type: 'timestamp', isNullable: true },
                    { name: 'call_time_start', type: 'time', isNullable: true },
                    { name: 'call_time_end', type: 'time', isNullable: true },
                    { name: 'created_at', type: 'timestamp', default: 'now()' },
                    { name: 'updated_at', type: 'timestamp', default: 'now()' },
                    { name: 'last_call_at', type: 'timestamp', isNullable: true }
                ]
            })
        );

        await queryRunner.createIndex('users', new TableIndex({ name: 'idx_users_email', columnNames: ['email'] }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('users');
    }
}
