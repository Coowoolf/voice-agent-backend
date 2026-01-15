// src/auth/entities/api-key.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('api_keys')
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    user_id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ unique: true })
    key_hash: string;  // SHA-256 hash of the actual key

    @Column({ length: 8 })
    key_prefix: string;  // First 8 chars for identification (e.g., "va_live_")

    @Column({ length: 100 })
    name: string;

    @Column({ type: 'timestamp', nullable: true })
    last_used_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    expires_at: Date;

    @Column({ default: true })
    is_active: boolean;

    @CreateDateColumn()
    created_at: Date;
}
