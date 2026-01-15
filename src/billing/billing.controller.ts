// src/billing/billing.controller.ts
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
    constructor(private billingService: BillingService) { }

    @Get('usage')
    async getUsage(@Request() req: any) {
        return this.billingService.getUsageStats(req.user.id);
    }

    @Get('quota')
    async checkQuota(@Request() req: any) {
        return this.billingService.checkQuota(req.user.id);
    }

    @Post('upgrade')
    async upgradePlan(
        @Request() req: any,
        @Body() body: { plan: 'free' | 'pro' | 'enterprise' }
    ) {
        // In real implementation, would integrate with Stripe/payment processor
        return this.billingService.upgradePlan(req.user.id, body.plan);
    }
}
