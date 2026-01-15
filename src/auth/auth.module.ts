// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ApiKeyGuard } from './guards/api-key.guard';
import { User } from '../users/entities/user.entity';
import { ApiKey } from './entities/api-key.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, ApiKey]),
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET') || 'default-secret',
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRATION') || '7d'
                },
            }),
            inject: [ConfigService],
        }),
        ConfigModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, ApiKeyGuard],
    exports: [AuthService, ApiKeyGuard],
})
export class AuthModule { }
