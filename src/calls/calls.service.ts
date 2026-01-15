// src/calls/calls.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallSession } from './entities/call-session.entity';
import { CreateCallDto, UpdateCallDto } from './dto/create-call.dto';
import { AgoraService } from '../agora/agora.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CallsService {
    private readonly logger = new Logger(CallsService.name);

    constructor(
        @InjectRepository(CallSession)
        private callSessionRepository: Repository<CallSession>,
        private agoraService: AgoraService,
    ) { }

    async createCall(user: User, createCallDto: CreateCallDto): Promise<CallSession> {
        this.logger.log(`Creating call for user ${user.id}, trigger: ${createCallDto.trigger_type}`);

        // Create call session record
        const callSession = this.callSessionRepository.create({
            user_id: user.id,
            trigger_type: createCallDto.trigger_type,
            trigger_context: createCallDto.trigger_context,
            phone_number: createCallDto.phone_number || user.phone_number_encrypted, // Would decrypt in real impl
            status: 'initiated',
            conversation: [],
        });

        await this.callSessionRepository.save(callSession);

        // Generate system prompt based on trigger type
        const systemPrompt = this.generateSystemPrompt(
            createCallDto.trigger_type,
            createCallDto.trigger_context,
            createCallDto.custom_prompt
        );

        // Initiate Agora call
        const agoraResult = await this.agoraService.createConversationalCall({
            phoneNumber: callSession.phone_number,
            language: user.language,
            systemPrompt,
            maxDuration: 300,
        });

        // Update with Agora session ID
        callSession.agora_call_id = agoraResult.sessionId;
        callSession.status = 'ringing';
        callSession.started_at = new Date();

        await this.callSessionRepository.save(callSession);

        return callSession;
    }

    async getCallById(callId: string, userId: string): Promise<CallSession> {
        const callSession = await this.callSessionRepository.findOne({
            where: { id: callId, user_id: userId }
        });

        if (!callSession) {
            throw new NotFoundException(`Call session ${callId} not found`);
        }

        return callSession;
    }

    async getUserCalls(userId: string, limit = 20): Promise<CallSession[]> {
        return this.callSessionRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
            take: limit,
        });
    }

    async updateCall(callId: string, userId: string, updateDto: UpdateCallDto): Promise<CallSession> {
        const callSession = await this.getCallById(callId, userId);

        if (updateDto.status) {
            callSession.status = updateDto.status;
            if (updateDto.status === 'completed' || updateDto.status === 'failed' || updateDto.status === 'missed') {
                callSession.ended_at = new Date();
                if (callSession.started_at) {
                    callSession.duration_seconds = Math.floor(
                        (callSession.ended_at.getTime() - callSession.started_at.getTime()) / 1000
                    );
                }
            }
        }

        if (updateDto.user_decision) {
            callSession.user_decision = updateDto.user_decision;
        }

        if (updateDto.conversation_update) {
            callSession.conversation = [
                ...callSession.conversation,
                {
                    ...updateDto.conversation_update,
                    timestamp: new Date(),
                }
            ];
        }

        return this.callSessionRepository.save(callSession);
    }

    async endCall(callId: string, userId: string): Promise<CallSession> {
        const callSession = await this.getCallById(callId, userId);

        if (callSession.agora_call_id) {
            await this.agoraService.endCall(callSession.agora_call_id);
        }

        return this.updateCall(callId, userId, { status: 'completed' });
    }

    private generateSystemPrompt(
        triggerType: string,
        context: object,
        customPrompt?: string
    ): string {
        if (customPrompt) {
            return customPrompt;
        }

        const basePrompt = `You are a helpful AI assistant calling a software developer. Be concise and professional.`;

        switch (triggerType) {
            case 'decision':
                return `${basePrompt} The developer needs to make a decision. Context: ${JSON.stringify(context)}. Present the options clearly and wait for their choice.`;
            case 'error':
                return `${basePrompt} There's a blocking error that needs attention. Context: ${JSON.stringify(context)}. Explain the error clearly and help the developer decide how to proceed.`;
            case 'completion':
                return `${basePrompt} A task has been completed. Context: ${JSON.stringify(context)}. Briefly summarize what was accomplished and ask if they need anything else.`;
            default:
                return basePrompt;
        }
    }
}
