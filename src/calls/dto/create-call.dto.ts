// src/calls/dto/create-call.dto.ts
import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateCallDto {
    @IsEnum(['decision', 'error', 'completion'])
    @IsNotEmpty()
    trigger_type: 'decision' | 'error' | 'completion';

    @IsObject()
    @IsNotEmpty()
    trigger_context: object;

    @IsString()
    @IsOptional()
    phone_number?: string;  // Optional, will use user's default if not provided

    @IsString()
    @IsOptional()
    custom_prompt?: string;
}

export class UpdateCallDto {
    @IsEnum(['answered', 'completed', 'failed', 'missed'])
    @IsOptional()
    status?: 'answered' | 'completed' | 'failed' | 'missed';

    @IsObject()
    @IsOptional()
    user_decision?: object;

    @IsObject()
    @IsOptional()
    conversation_update?: {
        role: string;
        content: string;
    };
}
