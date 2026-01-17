// src/agora/agora.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AgoraService } from './agora.service';
import { ConfigService } from '@nestjs/config';

describe('AgoraService', () => {
    let service: AgoraService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AgoraService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config: Record<string, string> = {
                                AGORA_APP_ID: 'test_app_id',
                                AGORA_API_KEY: 'test_api_key',
                                AGORA_API_SECRET: 'test_api_secret',
                                LLM_BASE_URL: 'http://127.0.0.1:8045/v1',
                                LLM_API_KEY: 'test_llm_key',
                                LLM_MODEL: 'gemini-3-flash'
                            };
                            return config[key];
                        })
                    }
                }
            ]
        }).compile();

        service = module.get<AgoraService>(AgoraService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createConversationalCall', () => {
        it('should create a conversational call session', async () => {
            const params = {
                phoneNumber: '+8613812345678',
                language: 'zh-CN',
                systemPrompt: 'You are an AI assistant helping a developer'
            };

            const result = await service.createConversationalCall(params);

            expect(result).toHaveProperty('sessionId');
            expect(result.sessionId).toMatch(/^agora_/);
            expect(result.status).toBe('initiated');
            expect(result.phoneNumber).toBe(params.phoneNumber);
        });

        it('should handle different languages', async () => {
            const params = {
                phoneNumber: '+14155551234',
                language: 'en-US',
                systemPrompt: 'You are an AI assistant'
            };

            const result = await service.createConversationalCall(params);

            expect(result.status).toBe('initiated');
        });
    });

    describe('getCallStatus', () => {
        it('should return call status', async () => {
            const sessionId = 'agora_123456789';

            const result = await service.getCallStatus(sessionId);

            expect(result.sessionId).toBe(sessionId);
            expect(result).toHaveProperty('status');
        });
    });

    describe('endCall', () => {
        it('should end the call', async () => {
            const sessionId = 'agora_123456789';

            const result = await service.endCall(sessionId);

            expect(result.sessionId).toBe(sessionId);
            expect(result.status).toBe('completed');
        });
    });
});
