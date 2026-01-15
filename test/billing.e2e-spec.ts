// test/billing.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Billing API (e2e)', () => {
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // In real tests, would login and get JWT token
        authToken = 'test_jwt_token';
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/billing/usage (GET)', () => {
        it('should return usage stats', async () => {
            const response = await request(app.getHttpServer())
                .get('/billing/usage')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('plan');
            expect(response.body).toHaveProperty('quota_used');
            expect(response.body).toHaveProperty('monthly_quota');
        });
    });

    describe('/billing/quota (GET)', () => {
        it('should check quota availability', async () => {
            const response = await request(app.getHttpServer())
                .get('/billing/quota')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('allowed');
            expect(response.body).toHaveProperty('remaining');
        });
    });

    describe('/billing/upgrade (POST)', () => {
        it('should upgrade plan', async () => {
            const response = await request(app.getHttpServer())
                .post('/billing/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ plan: 'pro' })
                .expect(200);

            expect(response.body.plan).toBe('pro');
        });

        it('should reject invalid plan', async () => {
            await request(app.getHttpServer())
                .post('/billing/upgrade')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ plan: 'invalid_plan' })
                .expect(400);
        });
    });
});
