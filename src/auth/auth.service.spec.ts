// src/auth/auth.service.spec.ts
// TDD: Testing AuthService - API key generation and validation
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { ApiKey } from './entities/api-key.entity';

describe('AuthService', () => {
    let service: AuthService;
    let userRepository: any;
    let apiKeyRepository: any;
    let jwtService: any;

    const mockUserRepository = {
        findOne: jest.fn(),
    };

    const mockApiKeyRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getRepositoryToken(User), useValue: mockUserRepository },
                { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepository },
                { provide: JwtService, useValue: mockJwtService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        jest.clearAllMocks();
    });

    describe('generateApiKey', () => {
        it('should throw UnauthorizedException when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.generateApiKey('non-existent', 'test-key'))
                .rejects.toThrow(UnauthorizedException);
        });

        it('should generate API key with va_live_ prefix', async () => {
            mockUserRepository.findOne.mockResolvedValue({ id: 'user-1' });
            mockApiKeyRepository.create.mockReturnValue({});
            mockApiKeyRepository.save.mockResolvedValue({ id: 'key-1' });

            const result = await service.generateApiKey('user-1', 'my-key');

            expect(result.key).toMatch(/^va_live_/);
            expect(result.key.length).toBeGreaterThan(20);
        });

        it('should store hashed key, not raw key', async () => {
            mockUserRepository.findOne.mockResolvedValue({ id: 'user-1' });
            let savedKeyHash: string | null = null;
            mockApiKeyRepository.create.mockImplementation((data) => {
                savedKeyHash = data.key_hash;
                return data;
            });
            mockApiKeyRepository.save.mockResolvedValue({ id: 'key-1' });

            const result = await service.generateApiKey('user-1', 'my-key');

            // Hash should NOT equal raw key
            expect(savedKeyHash).not.toBe(result.key);
            expect(savedKeyHash).toHaveLength(64); // SHA-256 hex
        });
    });

    describe('validateApiKey', () => {
        it('should return null for invalid key', async () => {
            mockApiKeyRepository.findOne.mockResolvedValue(null);

            const result = await service.validateApiKey('invalid_key');

            expect(result).toBeNull();
        });

        it('should return null for expired key', async () => {
            mockApiKeyRepository.findOne.mockResolvedValue({
                key_hash: 'hash',
                is_active: true,
                expires_at: new Date('2020-01-01'), // past
                user: { id: 'user-1' },
            });

            const result = await service.validateApiKey('some_key');

            expect(result).toBeNull();
        });

        it('should return user for valid key and update last_used_at', async () => {
            const mockUser = { id: 'user-1', email: 'test@test.com' };
            const mockApiKey = {
                key_hash: 'hash',
                is_active: true,
                expires_at: null,
                user: mockUser,
                last_used_at: null,
            };
            mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);
            mockApiKeyRepository.save.mockResolvedValue(mockApiKey);

            const result = await service.validateApiKey('some_key');

            expect(result).toEqual(mockUser);
            expect(mockApiKey.last_used_at).toBeInstanceOf(Date);
        });
    });

    describe('login', () => {
        it('should return access_token and user info', async () => {
            const mockUser = { id: 'user-1', email: 'test@test.com', plan: 'free' };
            mockJwtService.sign.mockReturnValue('jwt_token_123');

            const result = await service.login(mockUser as User);

            expect(result.access_token).toBe('jwt_token_123');
            expect(result.user.id).toBe('user-1');
            expect(result.user.email).toBe('test@test.com');
        });
    });

    describe('revokeApiKey', () => {
        it('should set is_active to false', async () => {
            const mockApiKey = { id: 'key-1', user_id: 'user-1', is_active: true };
            mockApiKeyRepository.findOne.mockResolvedValue(mockApiKey);
            mockApiKeyRepository.save.mockResolvedValue(mockApiKey);

            await service.revokeApiKey('key-1', 'user-1');

            expect(mockApiKey.is_active).toBe(false);
            expect(mockApiKeyRepository.save).toHaveBeenCalled();
        });

        it('should do nothing if key not found', async () => {
            mockApiKeyRepository.findOne.mockResolvedValue(null);

            await service.revokeApiKey('non-existent', 'user-1');

            expect(mockApiKeyRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('listApiKeys', () => {
        it('should return user API keys ordered by created_at', async () => {
            const mockKeys = [
                { id: 'key-1', name: 'Key 1' },
                { id: 'key-2', name: 'Key 2' },
            ];
            mockApiKeyRepository.find.mockResolvedValue(mockKeys);

            const result = await service.listApiKeys('user-1');

            expect(result).toEqual(mockKeys);
            expect(mockApiKeyRepository.find).toHaveBeenCalledWith({
                where: { user_id: 'user-1' },
                order: { created_at: 'DESC' },
            });
        });
    });
});
