// src/calls/calls.service.spec.ts
// TDD: Testing CallsService - call lifecycle management
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallSession } from './entities/call-session.entity';
import { AgoraService } from '../agora/agora.service';
import { BillingService } from '../billing/billing.service';

describe('CallsService', () => {
    let service: CallsService;

    const mockCallSessionRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockAgoraService = {
        createConversationalCall: jest.fn(),
        endCall: jest.fn(),
    };

    const mockBillingService = {
        consumeQuota: jest.fn(),
        getPlanLimits: jest.fn(),
    };

    const mockUser = {
        id: 'user-1',
        email: 'test@test.com',
        phone_number_encrypted: 'encrypted_phone',
        language: 'zh-CN',
        plan: 'pro',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CallsService,
                { provide: getRepositoryToken(CallSession), useValue: mockCallSessionRepository },
                { provide: AgoraService, useValue: mockAgoraService },
                { provide: BillingService, useValue: mockBillingService },
            ],
        }).compile();

        service = module.get<CallsService>(CallsService);
        jest.clearAllMocks();
    });

    describe('createCall', () => {
        it('should consume quota before creating call', async () => {
            mockBillingService.consumeQuota.mockResolvedValue(true);
            mockBillingService.getPlanLimits.mockReturnValue({ maxCallDuration: 600 });
            mockCallSessionRepository.create.mockReturnValue({ id: 'call-1' });
            mockCallSessionRepository.save.mockResolvedValue({ id: 'call-1' });
            mockAgoraService.createConversationalCall.mockResolvedValue({ sessionId: 'agora-123' });

            await service.createCall(mockUser as any, {
                trigger_type: 'decision',
                trigger_context: { message: 'Choose option' },
            });

            expect(mockBillingService.consumeQuota).toHaveBeenCalledWith('user-1');
        });

        it('should use plan-based maxDuration', async () => {
            mockBillingService.consumeQuota.mockResolvedValue(true);
            mockBillingService.getPlanLimits.mockReturnValue({ maxCallDuration: 600 });
            mockCallSessionRepository.create.mockReturnValue({ id: 'call-1' });
            mockCallSessionRepository.save.mockResolvedValue({ id: 'call-1' });
            mockAgoraService.createConversationalCall.mockResolvedValue({ sessionId: 'agora-123' });

            await service.createCall(mockUser as any, {
                trigger_type: 'decision',
                trigger_context: {},
            });

            expect(mockAgoraService.createConversationalCall).toHaveBeenCalledWith(
                expect.objectContaining({ maxDuration: 600 })
            );
        });

        it('should create call session with correct trigger type', async () => {
            mockBillingService.consumeQuota.mockResolvedValue(true);
            mockBillingService.getPlanLimits.mockReturnValue({ maxCallDuration: 300 });
            mockCallSessionRepository.create.mockReturnValue({ id: 'call-1' });
            mockCallSessionRepository.save.mockResolvedValue({ id: 'call-1' });
            mockAgoraService.createConversationalCall.mockResolvedValue({ sessionId: 'agora-123' });

            await service.createCall(mockUser as any, {
                trigger_type: 'error',
                trigger_context: { error: 'Build failed' },
            });

            expect(mockCallSessionRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ trigger_type: 'error' })
            );
        });
    });

    describe('getCallById', () => {
        it('should throw NotFoundException when call not found', async () => {
            mockCallSessionRepository.findOne.mockResolvedValue(null);

            await expect(service.getCallById('non-existent', 'user-1'))
                .rejects.toThrow(NotFoundException);
        });

        it('should return call session for valid id', async () => {
            const mockCall = { id: 'call-1', user_id: 'user-1', status: 'completed' };
            mockCallSessionRepository.findOne.mockResolvedValue(mockCall);

            const result = await service.getCallById('call-1', 'user-1');

            expect(result).toEqual(mockCall);
        });
    });

    describe('getUserCalls', () => {
        it('should return user calls ordered by created_at DESC', async () => {
            const mockCalls = [
                { id: 'call-2', created_at: new Date('2026-01-15') },
                { id: 'call-1', created_at: new Date('2026-01-14') },
            ];
            mockCallSessionRepository.find.mockResolvedValue(mockCalls);

            const result = await service.getUserCalls('user-1');

            expect(result).toEqual(mockCalls);
            expect(mockCallSessionRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({ order: { created_at: 'DESC' } })
            );
        });

        it('should respect limit parameter', async () => {
            mockCallSessionRepository.find.mockResolvedValue([]);

            await service.getUserCalls('user-1', 5);

            expect(mockCallSessionRepository.find).toHaveBeenCalledWith(
                expect.objectContaining({ take: 5 })
            );
        });
    });

    describe('endCall', () => {
        it('should call Agora endCall', async () => {
            const mockCall = { id: 'call-1', user_id: 'user-1', agora_call_id: 'agora-123' };
            mockCallSessionRepository.findOne.mockResolvedValue(mockCall);
            mockCallSessionRepository.save.mockResolvedValue({ ...mockCall, status: 'completed' });
            mockAgoraService.endCall.mockResolvedValue({ success: true });

            await service.endCall('call-1', 'user-1');

            expect(mockAgoraService.endCall).toHaveBeenCalledWith('agora-123');
        });
    });

    describe('updateCall', () => {
        it('should update call status', async () => {
            const mockCall = { id: 'call-1', user_id: 'user-1', status: 'ringing', conversation: [] };
            mockCallSessionRepository.findOne.mockResolvedValue(mockCall);
            mockCallSessionRepository.save.mockResolvedValue(mockCall);

            await service.updateCall('call-1', 'user-1', { status: 'answered' });

            expect(mockCall.status).toBe('answered');
        });

        it('should set ended_at when status is completed', async () => {
            const mockCall = {
                id: 'call-1',
                user_id: 'user-1',
                status: 'answered',
                started_at: new Date(),
                conversation: [],
            };
            mockCallSessionRepository.findOne.mockResolvedValue(mockCall);
            mockCallSessionRepository.save.mockResolvedValue(mockCall);

            await service.updateCall('call-1', 'user-1', { status: 'completed' });

            expect(mockCall.ended_at).toBeInstanceOf(Date);
            expect(mockCall.duration_seconds).toBeGreaterThanOrEqual(0);
        });

        it('should append conversation updates', async () => {
            const mockCall = {
                id: 'call-1',
                user_id: 'user-1',
                status: 'answered',
                conversation: [{ role: 'assistant', content: 'Hello' }],
            };
            mockCallSessionRepository.findOne.mockResolvedValue(mockCall);
            mockCallSessionRepository.save.mockResolvedValue(mockCall);

            await service.updateCall('call-1', 'user-1', {
                conversation_update: { role: 'user', content: 'Hi there' },
            });

            expect(mockCall.conversation).toHaveLength(2);
            expect(mockCall.conversation[1].role).toBe('user');
        });
    });
});
