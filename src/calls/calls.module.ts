// src/calls/calls.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallSession } from './entities/call-session.entity';
import { AgoraModule } from '../agora/agora.module';
import { BillingModule } from '../billing/billing.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([CallSession]),
        AgoraModule,
        BillingModule,
    ],
    controllers: [CallsController],
    providers: [CallsService],
    exports: [CallsService],
})
export class CallsModule { }
