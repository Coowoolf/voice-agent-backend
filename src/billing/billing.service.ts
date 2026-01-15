// src/billing/billing.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { User } from '../users/entities/user.entity';

export interface PlanLimits {
    monthlyQuota: number;
    maxCallDuration: number;  // seconds
    features: string[];
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
    free: {
        monthlyQuota: 10,
        maxCallDuration: 180,  // 3 minutes
        features: ['decision_calls', 'error_calls'],
    },
    pro: {
        monthlyQuota: 100,
        maxCallDuration: 600,  // 10 minutes
        features: ['decision_calls', 'error_calls', 'completion_calls', 'custom_prompts'],
    },
    enterprise: {
        monthlyQuota: -1,  // unlimited
        maxCallDuration: 1800,  // 30 minutes
        features: ['all'],
    },
};

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async checkQuota(userId: string): Promise<{ allowed: boolean; remaining: number; message?: string }> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            return { allowed: false, remaining: 0, message: 'User not found' };
        }

        const limits = PLAN_LIMITS[user.plan];

        // Enterprise has unlimited quota
        if (limits.monthlyQuota === -1) {
            return { allowed: true, remaining: -1 };
        }

        const remaining = user.monthly_quota - user.quota_used;

        if (remaining <= 0) {
            return {
                allowed: false,
                remaining: 0,
                message: `Monthly quota exceeded. Upgrade to Pro for more calls.`,
            };
        }

        return { allowed: true, remaining };
    }

    async consumeQuota(userId: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            return false;
        }

        const check = await this.checkQuota(userId);
        if (!check.allowed) {
            throw new BadRequestException(check.message);
        }

        // Don't consume quota for enterprise (unlimited)
        if (PLAN_LIMITS[user.plan].monthlyQuota !== -1) {
            user.quota_used += 1;
            user.last_call_at = new Date();
            await this.userRepository.save(user);
        }

        return true;
    }

    async getUsageStats(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            return null;
        }

        const limits = PLAN_LIMITS[user.plan];

        return {
            plan: user.plan,
            quota_used: user.quota_used,
            monthly_quota: limits.monthlyQuota,
            remaining: limits.monthlyQuota === -1 ? -1 : limits.monthlyQuota - user.quota_used,
            max_call_duration: limits.maxCallDuration,
            features: limits.features,
            quota_reset_at: user.quota_reset_at,
        };
    }

    async upgradePlan(userId: string, newPlan: 'free' | 'pro' | 'enterprise') {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        const newLimits = PLAN_LIMITS[newPlan];

        user.plan = newPlan;
        user.monthly_quota = newLimits.monthlyQuota;

        await this.userRepository.save(user);

        this.logger.log(`User ${userId} upgraded to ${newPlan}`);

        return this.getUsageStats(userId);
    }

    // Reset quotas on the 1st of each month
    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
    async resetMonthlyQuotas() {
        this.logger.log('Resetting monthly quotas...');

        const result = await this.userRepository.update(
            { quota_used: MoreThan(0) },
            {
                quota_used: 0,
                quota_reset_at: new Date()
            }
        );

        this.logger.log(`Reset quotas for ${result.affected} users`);
    }

    getPlanLimits(plan: string): PlanLimits {
        return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
    }
}
