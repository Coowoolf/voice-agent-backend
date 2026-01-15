// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ type: 'text' })
    phone_number_encrypted: string;  // AES-256 encrypted

    @Column({ length: 10 })
    language: string;  // zh-CN, en-US, etc.

    @Column({ nullable: true })
    timezone: string;

    @Column({ type: 'enum', enum: ['free', 'pro', 'enterprise'], default: 'free' })
    plan: string;

    @Column({ type: 'int', default: 10 })
    monthly_quota: number;

    @Column({ type: 'int', default: 0 })
    quota_used: number;

    @Column({ type: 'timestamp', nullable: true })
    quota_reset_at: Date;

    @Column({ type: 'time', nullable: true })
    call_time_start: string;

    @Column({ type: 'time', nullable: true })
    call_time_end: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    last_call_at: Date;
}
