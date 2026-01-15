// src/auth/auth.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { ApiKey } from './entities/api-key.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(ApiKey)
        private apiKeyRepository: Repository<ApiKey>,
        private jwtService: JwtService,
    ) { }

    // JWT-based authentication for web UI
    async validateUserByEmail(email: string, password: string): Promise<User | null> {
        const user = await this.userRepository.findOne({ where: { email } });
        if (user) {
            // In real impl, would verify password hash
            return user;
        }
        return null;
    }

    async login(user: User) {
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                plan: user.plan,
            },
        };
    }

    // API Key authentication for plugin
    async generateApiKey(userId: string, name: string): Promise<{ key: string; apiKey: ApiKey }> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        // Generate a secure random API key
        const rawKey = `va_live_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPrefix = rawKey.substring(0, 8);

        const apiKey = this.apiKeyRepository.create({
            user_id: userId,
            key_hash: keyHash,
            key_prefix: keyPrefix,
            name,
            is_active: true,
        });

        await this.apiKeyRepository.save(apiKey);

        this.logger.log(`Generated API key for user ${userId}`);

        return {
            key: rawKey,  // Only returned once!
            apiKey,
        };
    }

    async validateApiKey(rawKey: string): Promise<User | null> {
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const apiKey = await this.apiKeyRepository.findOne({
            where: { key_hash: keyHash, is_active: true },
            relations: ['user'],
        });

        if (!apiKey) {
            return null;
        }

        // Check expiration
        if (apiKey.expires_at && apiKey.expires_at < new Date()) {
            return null;
        }

        // Update last used timestamp
        apiKey.last_used_at = new Date();
        await this.apiKeyRepository.save(apiKey);

        return apiKey.user;
    }

    async revokeApiKey(keyId: string, userId: string): Promise<void> {
        const apiKey = await this.apiKeyRepository.findOne({
            where: { id: keyId, user_id: userId }
        });

        if (apiKey) {
            apiKey.is_active = false;
            await this.apiKeyRepository.save(apiKey);
        }
    }

    async listApiKeys(userId: string): Promise<ApiKey[]> {
        return this.apiKeyRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }
}
