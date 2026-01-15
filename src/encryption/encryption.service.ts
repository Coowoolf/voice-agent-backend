// src/encryption/encryption.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32; // 256 bits
    private readonly ivLength = 16;
    private readonly tagLength = 16;
    private encryptionKey: Buffer;

    constructor(private configService: ConfigService) {
        this.initializeKey();
    }

    private initializeKey() {
        const keyString = this.configService.get<string>('ENCRYPTION_KEY');

        if (keyString) {
            // Use provided key (should be 64 hex characters = 32 bytes)
            this.encryptionKey = Buffer.from(keyString, 'hex');
        } else {
            // Generate a key for development (NOT for production!)
            this.logger.warn('No ENCRYPTION_KEY provided, using generated key. Set ENCRYPTION_KEY in production!');
            this.encryptionKey = crypto.randomBytes(this.keyLength);
        }

        if (this.encryptionKey.length !== this.keyLength) {
            throw new Error(`Encryption key must be ${this.keyLength} bytes (${this.keyLength * 2} hex characters)`);
        }
    }

    /**
     * Encrypt a phone number using AES-256-GCM
     * Returns: iv:tag:ciphertext (all hex encoded)
     */
    encryptPhoneNumber(phoneNumber: string): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

        let encrypted = cipher.update(phoneNumber, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const tag = cipher.getAuthTag();

        // Format: iv:tag:ciphertext
        return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt a phone number encrypted with encryptPhoneNumber
     */
    decryptPhoneNumber(encryptedData: string): string {
        const parts = encryptedData.split(':');

        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, tagHex, ciphertext] = parts;
        const iv = Buffer.from(ivHex, 'hex');
        const tag = Buffer.from(tagHex, 'hex');

        const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Mask a phone number for display (e.g., +86138****5678)
     */
    maskPhoneNumber(phoneNumber: string): string {
        if (phoneNumber.length < 8) {
            return '****';
        }

        // Keep first 4 and last 4 characters
        const prefix = phoneNumber.slice(0, 4);
        const suffix = phoneNumber.slice(-4);
        const maskedLength = phoneNumber.length - 8;

        return `${prefix}${'*'.repeat(maskedLength)}${suffix}`;
    }

    /**
     * Validate phone number format
     */
    isValidPhoneNumber(phoneNumber: string): boolean {
        // E.164 format: +[country code][number], 8-15 digits
        const e164Regex = /^\+[1-9]\d{7,14}$/;
        return e164Regex.test(phoneNumber);
    }
}
