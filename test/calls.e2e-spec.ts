// test/calls.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Calls API (e2e)', () => {
    let app: INestApplication;
    let apiKey: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        // In real tests, would create a test user and get API key
        apiKey = 'va_live_test_key';
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/calls (POST)', () => {
        it('should create a new call', async () => {
            const createCallDto = {
                trigger_type: 'decision',
                trigger_context: {
                    message: 'Deploy to production?',
                    options: ['deploy', 'cancel']
                }
            };

            const response = await request(app.getHttpServer())
                .post('/calls')
                .set('Authorization', `Bearer ${apiKey}`)
                .send(createCallDto)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.trigger_type).toBe('decision');
            expect(response.body.status).toBeDefined();
        });

        it('should reject invalid trigger type', async () => {
            const invalidDto = {
                trigger_type: 'invalid_type',
                trigger_context: {}
            };

            await request(app.getHttpServer())
                .post('/calls')
                .set('Authorization', `Bearer ${apiKey}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe('/calls (GET)', () => {
        it('should return user calls', async () => {
            const response = await request(app.getHttpServer())
                .get('/calls')
                .set('Authorization', `Bearer ${apiKey}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should respect limit parameter', async () => {
            const response = await request(app.getHttpServer())
                .get('/calls?limit=5')
                .set('Authorization', `Bearer ${apiKey}`)
                .expect(200);

            expect(response.body.length).toBeLessThanOrEqual(5);
        });
    });

    describe('/calls/:id (GET)', () => {
        it('should return 404 for non-existent call', async () => {
            await request(app.getHttpServer())
                .get('/calls/non-existent-id')
                .set('Authorization', `Bearer ${apiKey}`)
                .expect(404);
        });
    });

    describe('Authentication', () => {
        it('should reject requests without API key', async () => {
            await request(app.getHttpServer())
                .get('/calls')
                .expect(401);
        });

        it('should reject invalid API key', async () => {
            await request(app.getHttpServer())
                .get('/calls')
                .set('Authorization', 'Bearer invalid_key')
                .expect(401);
        });
    });
});
