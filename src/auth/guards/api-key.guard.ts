// src/auth/guards/api-key.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private authService: AuthService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKey = this.extractApiKey(request);

        if (!apiKey) {
            throw new UnauthorizedException('API key is required');
        }

        const user = await this.authService.validateApiKey(apiKey);

        if (!user) {
            throw new UnauthorizedException('Invalid API key');
        }

        request.user = user;
        return true;
    }

    private extractApiKey(request: any): string | null {
        // Check Authorization header: Bearer va_live_xxx
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            if (token.startsWith('va_')) {
                return token;
            }
        }

        // Check X-API-Key header
        const apiKeyHeader = request.headers['x-api-key'];
        if (apiKeyHeader) {
            return apiKeyHeader;
        }

        return null;
    }
}
