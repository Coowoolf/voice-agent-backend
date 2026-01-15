// src/calls/entities/call-session.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type TriggerType = 'decision' | 'error' | 'completion';
export type CallStatus = 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'missed';

export interface ConversationMessage {
    role: string;
    content: string;
    timestamp: Date;
}

@Entity('call_sessions')
export class CallSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    user_id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'enum', enum: ['decision', 'error', 'completion'] })
    trigger_type: TriggerType;

    @Column({ type: 'jsonb' })
    trigger_context: object;

    @Column({ nullable: true })
    agora_call_id: string;

    @Column()
    phone_number: string;

    @Column({ type: 'enum', enum: ['initiated', 'ringing', 'answered', 'completed', 'failed', 'missed'] })
    status: CallStatus;

    @Column({ type: 'jsonb', default: '[]' })
    conversation: ConversationMessage[];

    @Column({ type: 'jsonb', nullable: true })
    user_decision: object;

    @Column({ type: 'int', nullable: true })
    duration_seconds: number;

    @Column({ type: 'timestamp', nullable: true })
    started_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    ended_at: Date;

    @CreateDateColumn()
    created_at: Date;
}
