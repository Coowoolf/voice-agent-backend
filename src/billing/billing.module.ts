// src/billing/billing.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { User } from '../users/entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        ScheduleModule.forRoot(),
    ],
    controllers: [BillingController],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule { }
