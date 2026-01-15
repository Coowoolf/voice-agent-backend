// src/users/users.service.ts
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { EncryptionService } from '../encryption/encryption.service';

export interface CreateUserDto {
    email: string;
    phone_number: string;
    language?: string;
    timezone?: string;
}

export interface UpdateUserDto {
    phone_number?: string;
    language?: string;
    timezone?: string;
    call_time_start?: string;
    call_time_end?: string;
}

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private encryptionService: EncryptionService,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOne({
            where: { email: createUserDto.email }
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Validate and encrypt phone number
        if (!this.encryptionService.isValidPhoneNumber(createUserDto.phone_number)) {
            throw new ConflictException('Invalid phone number format (E.164 required)');
        }

        const encryptedPhone = this.encryptionService.encryptPhoneNumber(createUserDto.phone_number);

        const user = this.userRepository.create({
            email: createUserDto.email,
            phone_number_encrypted: encryptedPhone,
            language: createUserDto.language || 'zh-CN',
            timezone: createUserDto.timezone,
            plan: 'free',
            monthly_quota: 10,
            quota_used: 0,
        });

        return this.userRepository.save(user);
    }

    async findById(id: string): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async update(id: string, updateDto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);

        if (updateDto.phone_number) {
            if (!this.encryptionService.isValidPhoneNumber(updateDto.phone_number)) {
                throw new ConflictException('Invalid phone number format (E.164 required)');
            }
            user.phone_number_encrypted = this.encryptionService.encryptPhoneNumber(updateDto.phone_number);
        }

        if (updateDto.language) user.language = updateDto.language;
        if (updateDto.timezone) user.timezone = updateDto.timezone;
        if (updateDto.call_time_start) user.call_time_start = updateDto.call_time_start;
        if (updateDto.call_time_end) user.call_time_end = updateDto.call_time_end;

        return this.userRepository.save(user);
    }

    async getProfile(id: string) {
        const user = await this.findById(id);
        const decryptedPhone = this.encryptionService.decryptPhoneNumber(user.phone_number_encrypted);

        return {
            id: user.id,
            email: user.email,
            phone_number_masked: this.encryptionService.maskPhoneNumber(decryptedPhone),
            language: user.language,
            timezone: user.timezone,
            plan: user.plan,
            monthly_quota: user.monthly_quota,
            quota_used: user.quota_used,
            call_time_start: user.call_time_start,
            call_time_end: user.call_time_end,
            created_at: user.created_at,
        };
    }
}
