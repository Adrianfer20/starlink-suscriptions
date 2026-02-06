import express from 'express';
import request from 'supertest';

let mockVerify = jest.fn();

jest.mock('firebase-admin', () => ({
  auth: () => ({
    verifyIdToken: (...args: any[]) => mockVerify(...args),
  }),
}));

import authenticate from '../auth';

describe('authenticate middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.get('/auth-only', authenticate, (req: any, res) => res.json({ ok: true, user: req.user }));
  });

  afterEach(() => {
    mockVerify.mockReset();
  });

  test('returns 401 when no header', async () => {
    const res = await request(app).get('/auth-only');
    expect(res.status).toBe(401);
  });

  test('accepts test tokens in NODE_ENV=test', async () => {
    process.env.NODE_ENV = 'test';
    const res = await request(app).get('/auth-only').set('Authorization', 'Bearer test-admin');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ uid: 'testuid', role: 'admin' });
  });

  test('verifies with firebase-admin', async () => {
    process.env.NODE_ENV = 'not-test';
    mockVerify.mockResolvedValue({ uid: 'u1', admin: true });
    const res = await request(app).get('/auth-only').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ uid: 'u1', role: 'admin' });
  });

  test('returns 401 when token invalid', async () => {
    process.env.NODE_ENV = 'not-test';
    mockVerify.mockRejectedValue(new Error('bad'));
    const res = await request(app).get('/auth-only').set('Authorization', 'Bearer token');
    expect(res.status).toBe(401);
  });
});
