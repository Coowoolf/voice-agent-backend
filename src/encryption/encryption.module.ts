// src/encryption/encryption.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

@Global()  // Make available globally without importing
@Module({
    imports: [ConfigModule],
    providers: [EncryptionService],
    exports: [EncryptionService],
})
export class EncryptionModule { }
