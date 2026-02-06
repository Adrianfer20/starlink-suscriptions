import express from 'express';
import request from 'supertest';

import { requireRole } from '../requireRole';

describe('requireRole middleware', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    // route without any user
    app.get('/no-user', requireRole('admin'), (_req, res) => res.json({ ok: true }));

    // route with user but no role
    app.get('/no-role', (req: any, _res, next) => { req.user = {}; next(); }, requireRole('admin'), (_req, res) => res.json({ ok: true }));

    // route where role not allowed
    app.get('/not-allowed', (req: any, _res, next) => { req.user = { uid: 'u1', role: 'client' }; next(); }, requireRole('admin'), (_req, res) => res.json({ ok: true }));

    // route allowed single role
    app.get('/allowed-admin', (req: any, _res, next) => { req.user = { uid: 'u2', role: 'admin' }; next(); }, requireRole('admin'), (_req, res) => res.json({ ok: true }));

    // route allowed multiple roles
    app.get('/allowed-multi', (req: any, _res, next) => { req.user = { uid: 'u3', role: 'client' }; next(); }, requireRole(['admin','client']), (_req, res) => res.json({ ok: true }));
  });

  test('returns 401 if no user present', async () => {
    const res = await request(app).get('/no-user');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('message', 'Unauthenticated');
  });

  test('returns 403 if user has no role', async () => {
    const res = await request(app).get('/no-role');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Role not assigned');
  });

  test('returns 403 when role not allowed', async () => {
    const res = await request(app).get('/not-allowed');
    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('message', 'Forbidden');
  });

  test('allows when role matches single', async () => {
    const res = await request(app).get('/allowed-admin');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  test('allows when role matches array', async () => {
    const res = await request(app).get('/allowed-multi');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });
});
