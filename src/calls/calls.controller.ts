// src/calls/calls.controller.ts
import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpCode,
    HttpStatus
} from '@nestjs/common';
import { CallsService } from './calls.service';
import { CreateCallDto, UpdateCallDto } from './dto/create-call.dto';

// Placeholder for auth guard - will implement in Task 8
// @UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
    constructor(private readonly callsService: CallsService) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createCall(
        @Request() req: any,
        @Body() createCallDto: CreateCallDto
    ) {
        // req.user will be populated by auth guard
        const user = req.user || { id: 'test-user', language: 'zh-CN', phone_number_encrypted: '+8613800000000' };
        return this.callsService.createCall(user, createCallDto);
    }

    @Get()
    async getUserCalls(
        @Request() req: any,
        @Query('limit') limit?: number
    ) {
        const userId = req.user?.id || 'test-user';
        return this.callsService.getUserCalls(userId, limit);
    }

    @Get(':id')
    async getCall(
        @Request() req: any,
        @Param('id') callId: string
    ) {
        const userId = req.user?.id || 'test-user';
        return this.callsService.getCallById(callId, userId);
    }

    @Patch(':id')
    async updateCall(
        @Request() req: any,
        @Param('id') callId: string,
        @Body() updateCallDto: UpdateCallDto
    ) {
        const userId = req.user?.id || 'test-user';
        return this.callsService.updateCall(callId, userId, updateCallDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async endCall(
        @Request() req: any,
        @Param('id') callId: string
    ) {
        const userId = req.user?.id || 'test-user';
        return this.callsService.endCall(callId, userId);
    }
}
