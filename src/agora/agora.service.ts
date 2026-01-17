// src/agora/agora.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConversationalCallParams {
    phoneNumber: string;
    language: string;
    systemPrompt: string;
    maxDuration?: number;
}

export interface CallResult {
    sessionId: string;
    status: string;
    phoneNumber?: string;
}

export interface LLMConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

@Injectable()
export class AgoraService {
    private readonly logger = new Logger(AgoraService.name);
    private agoraAppId: string;
    private agoraApiKey: string;
    private agoraApiSecret: string;
    private llmConfig: LLMConfig;

    constructor(private configService: ConfigService) {
        this.initializeClient();
    }

    private initializeClient() {
        this.agoraAppId = this.configService.get<string>('AGORA_APP_ID') || '';
        this.agoraApiKey = this.configService.get<string>('AGORA_API_KEY') || '';
        this.agoraApiSecret = this.configService.get<string>('AGORA_API_SECRET') || '';

        // Flexible LLM configuration - supports OpenAI-compatible endpoints (Gemini, OpenAI, etc.)
        this.llmConfig = {
            baseUrl: this.configService.get<string>('LLM_BASE_URL') || 'http://127.0.0.1:8045/v1',
            apiKey: this.configService.get<string>('LLM_API_KEY') || '',
            model: this.configService.get<string>('LLM_MODEL') || 'gemini-3-flash',
        };

        this.logger.log(`Agora Conversational AI client initialized with LLM: ${this.llmConfig.model}`);
    }

    async createConversationalCall(params: ConversationalCallParams): Promise<CallResult> {
        this.logger.log(`Creating conversational call to ${params.phoneNumber}`);

        // Agora Conversational AI integration with OpenAI-compatible LLM
        // The Agora SDK can use any OpenAI-compatible endpoint
        // This includes: Gemini (via proxy), OpenAI, Claude (via proxy), etc.

        // TODO: Full Agora SDK integration
        // const session = await this.agoraClient.createCall({
        //   phone: params.phoneNumber,
        //   language: params.language,
        //   llmConfig: {
        //     baseUrl: this.llmConfig.baseUrl,
        //     apiKey: this.llmConfig.apiKey,
        //     model: this.llmConfig.model,
        //     systemPrompt: params.systemPrompt
        //   },
        //   maxDuration: params.maxDuration || 300
        // });

        return {
            sessionId: `agora_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            status: 'initiated',
            phoneNumber: params.phoneNumber
        };
    }

    async getCallStatus(sessionId: string): Promise<CallResult> {
        this.logger.log(`Getting status for session ${sessionId}`);

        // TODO: Query Agora for actual call status
        return {
            sessionId,
            status: 'ringing'
        };
    }

    async endCall(sessionId: string): Promise<CallResult> {
        this.logger.log(`Ending call for session ${sessionId}`);

        // TODO: End the call via Agora SDK
        return {
            sessionId,
            status: 'completed'
        };
    }

    async updateCallContext(sessionId: string, context: object): Promise<void> {
        this.logger.log(`Updating context for session ${sessionId}`);
        // TODO: Update conversation context mid-call if needed
    }

    // Test LLM connection
    async testLLMConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${this.llmConfig.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.llmConfig.apiKey}`
                },
                body: JSON.stringify({
                    model: this.llmConfig.model,
                    messages: [{ role: 'user', content: 'Hello, this is a test.' }],
                    max_tokens: 50
                })
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    success: true,
                    message: `LLM connected: ${data.choices?.[0]?.message?.content || 'OK'}`
                };
            } else {
                return { success: false, message: `HTTP ${response.status}` };
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}
