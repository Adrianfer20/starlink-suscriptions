import express from 'express';
import request from 'supertest';

describe('feature flag: FEATURE_AUTH_ROLES', () => {
  beforeEach(() => {
    process.env.FEATURE_AUTH_ROLES = 'false';
    process.env.DEV_ACCOUNT_UID = 'dev-uid';
    process.env.DEV_ACCOUNT_ROLE = 'admin';
    jest.resetModules();
  });

  test('when disabled authenticate bypasses and sets dev user', async () => {
    const authenticate = require('../auth').authenticate;
    const app = express();
    app.get('/auth-only', authenticate, (req: any, res) => res.json({ ok: true, user: req.user }));

    const res = await request(app).get('/auth-only');
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ uid: 'dev-uid', role: 'admin' });
  });
});
