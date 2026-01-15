// src/encryption/encryption.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'ENCRYPTION_KEY') {
                                // 32 bytes = 64 hex characters
                                return 'a'.repeat(64);
                            }
                            return null;
                        })
                    }
                }
            ]
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('encryptPhoneNumber / decryptPhoneNumber', () => {
        it('should encrypt and decrypt a phone number correctly', () => {
            const phoneNumber = '+8613812345678';

            const encrypted = service.encryptPhoneNumber(phoneNumber);
            const decrypted = service.decryptPhoneNumber(encrypted);

            expect(decrypted).toBe(phoneNumber);
        });

        it('should produce different ciphertext for same input (due to random IV)', () => {
            const phoneNumber = '+8613812345678';

            const encrypted1 = service.encryptPhoneNumber(phoneNumber);
            const encrypted2 = service.encryptPhoneNumber(phoneNumber);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('should handle international phone numbers', () => {
            const testNumbers = [
                '+14155551234',
                '+8613812345678',
                '+447911123456',
                '+81312345678',
            ];

            testNumbers.forEach(phoneNumber => {
                const encrypted = service.encryptPhoneNumber(phoneNumber);
                const decrypted = service.decryptPhoneNumber(encrypted);
                expect(decrypted).toBe(phoneNumber);
            });
        });
    });

    describe('maskPhoneNumber', () => {
        it('should mask the middle of a phone number', () => {
            const phoneNumber = '+8613812345678';
            const masked = service.maskPhoneNumber(phoneNumber);

            expect(masked).toBe('+861******5678');
        });

        it('should return **** for very short numbers', () => {
            expect(service.maskPhoneNumber('12345')).toBe('****');
        });
    });

    describe('isValidPhoneNumber', () => {
        it('should validate correct E.164 numbers', () => {
            expect(service.isValidPhoneNumber('+8613812345678')).toBe(true);
            expect(service.isValidPhoneNumber('+14155551234')).toBe(true);
        });

        it('should reject invalid numbers', () => {
            expect(service.isValidPhoneNumber('13812345678')).toBe(false);  // No +
            expect(service.isValidPhoneNumber('+123')).toBe(false);  // Too short
            expect(service.isValidPhoneNumber('not-a-number')).toBe(false);
        });
    });
});
