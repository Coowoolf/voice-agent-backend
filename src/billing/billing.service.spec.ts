// src/billing/billing.service.spec.ts
// TDD: RED phase - Write failing tests first
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { User } from '../users/entities/user.entity';

describe('BillingService', () => {
    let service: BillingService;
    let userRepository: jest.Mocked<Repository<User>>;

    const mockUserRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BillingService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<BillingService>(BillingService);
        userRepository = module.get(getRepositoryToken(User));
        jest.clearAllMocks();
    });

    describe('checkQuota', () => {
        it('should return not allowed when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.checkQuota('non-existent-id');

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.message).toBe('User not found');
        });

        it('should return unlimited quota for enterprise users', async () => {
            mockUserRepository.findOne.mockResolvedValue({
                id: 'user-1',
                plan: 'enterprise',
                monthly_quota: -1,
                quota_used: 100,
            });

            const result = await service.checkQuota('user-1');

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(-1);
        });

        it('should return remaining quota for free users', async () => {
            mockUserRepository.findOne.mockResolvedValue({
                id: 'user-1',
                plan: 'free',
                monthly_quota: 10,
                quota_used: 3,
            });

            const result = await service.checkQuota('user-1');

            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(7);
        });

        it('should deny when quota exceeded', async () => {
            mockUserRepository.findOne.mockResolvedValue({
                id: 'user-1',
                plan: 'free',
                monthly_quota: 10,
                quota_used: 10,
            });

            const result = await service.checkQuota('user-1');

            expect(result.allowed).toBe(false);
            expect(result.remaining).toBe(0);
            expect(result.message).toContain('Monthly quota exceeded');
        });
    });

    describe('consumeQuota', () => {
        it('should return false when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.consumeQuota('non-existent-id');

            expect(result).toBe(false);
        });

        it('should throw BadRequestException when quota exceeded', async () => {
            mockUserRepository.findOne.mockResolvedValue({
                id: 'user-1',
                plan: 'free',
                monthly_quota: 10,
                quota_used: 10,
            });

            await expect(service.consumeQuota('user-1')).rejects.toThrow(BadRequestException);
        });

        it('should increment quota_used for non-enterprise users', async () => {
            const mockUser = {
                id: 'user-1',
                plan: 'free',
                monthly_quota: 10,
                quota_used: 5,
            };
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.save.mockResolvedValue(mockUser);

            const result = await service.consumeQuota('user-1');

            expect(result).toBe(true);
            expect(mockUser.quota_used).toBe(6);
            expect(mockUserRepository.save).toHaveBeenCalled();
        });

        it('should not increment quota for enterprise users', async () => {
            const mockUser = {
                id: 'user-1',
                plan: 'enterprise',
                monthly_quota: -1,
                quota_used: 0,
            };
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.consumeQuota('user-1');

            expect(result).toBe(true);
            expect(mockUser.quota_used).toBe(0);
            expect(mockUserRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('getPlanLimits', () => {
        it('should return correct limits for free plan', () => {
            const limits = service.getPlanLimits('free');

            expect(limits.monthlyQuota).toBe(10);
            expect(limits.maxCallDuration).toBe(180);
            expect(limits.features).toContain('decision_calls');
        });

        it('should return correct limits for pro plan', () => {
            const limits = service.getPlanLimits('pro');

            expect(limits.monthlyQuota).toBe(100);
            expect(limits.maxCallDuration).toBe(600);
            expect(limits.features).toContain('custom_prompts');
        });

        it('should return correct limits for enterprise plan', () => {
            const limits = service.getPlanLimits('enterprise');

            expect(limits.monthlyQuota).toBe(-1); // unlimited
            expect(limits.maxCallDuration).toBe(1800);
        });

        it('should fallback to free plan for unknown plans', () => {
            const limits = service.getPlanLimits('unknown');

            expect(limits.monthlyQuota).toBe(10);
        });
    });

    describe('getUsageStats', () => {
        it('should return null for non-existent user', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.getUsageStats('non-existent');

            expect(result).toBeNull();
        });

        it('should return usage stats with calculated remaining', async () => {
            mockUserRepository.findOne.mockResolvedValue({
                id: 'user-1',
                plan: 'pro',
                monthly_quota: 100,
                quota_used: 25,
                quota_reset_at: new Date('2026-02-01'),
            });

            const result = await service.getUsageStats('user-1');

            expect(result).not.toBeNull();
            expect(result!.plan).toBe('pro');
            expect(result!.quota_used).toBe(25);
            expect(result!.remaining).toBe(75);
            expect(result!.max_call_duration).toBe(600);
        });
    });

    describe('upgradePlan', () => {
        it('should throw BadRequestException for non-existent user', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.upgradePlan('non-existent', 'pro')).rejects.toThrow(BadRequestException);
        });

        it('should update user plan and quota', async () => {
            const mockUser = {
                id: 'user-1',
                plan: 'free',
                monthly_quota: 10,
                quota_used: 5,
            };
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.save.mockResolvedValue(mockUser);

            const result = await service.upgradePlan('user-1', 'pro');

            expect(mockUser.plan).toBe('pro');
            expect(mockUser.monthly_quota).toBe(100);
            expect(mockUserRepository.save).toHaveBeenCalled();
        });
    });
});
