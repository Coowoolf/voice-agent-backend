// src/auth/auth.controller.ts
import { Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class CreateApiKeyDto {
    name: string;
}

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('api-keys')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.CREATED)
    async createApiKey(
        @Request() req: any,
        @Body() createDto: CreateApiKeyDto
    ) {
        const result = await this.authService.generateApiKey(req.user.id, createDto.name);
        return {
            key: result.key,  // Only shown once!
            id: result.apiKey.id,
            name: result.apiKey.name,
            key_prefix: result.apiKey.key_prefix,
            created_at: result.apiKey.created_at,
        };
    }

    @Get('api-keys')
    @UseGuards(JwtAuthGuard)
    async listApiKeys(@Request() req: any) {
        const keys = await this.authService.listApiKeys(req.user.id);
        return keys.map(k => ({
            id: k.id,
            name: k.name,
            key_prefix: k.key_prefix,
            last_used_at: k.last_used_at,
            is_active: k.is_active,
            created_at: k.created_at,
        }));
    }

    @Delete('api-keys/:id')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeApiKey(
        @Request() req: any,
        @Param('id') keyId: string
    ) {
        await this.authService.revokeApiKey(keyId, req.user.id);
    }
}
