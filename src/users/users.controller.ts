// src/users/users.controller.ts
import { Controller, Get, Post, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        const user = await this.usersService.create(createUserDto);
        return {
            id: user.id,
            email: user.email,
            message: 'User registered successfully',
        };
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req: any) {
        return this.usersService.getProfile(req.user.id);
    }

    @Patch('me')
    @UseGuards(JwtAuthGuard)
    async updateProfile(@Request() req: any, @Body() updateDto: UpdateUserDto) {
        await this.usersService.update(req.user.id, updateDto);
        return this.usersService.getProfile(req.user.id);
    }
}
