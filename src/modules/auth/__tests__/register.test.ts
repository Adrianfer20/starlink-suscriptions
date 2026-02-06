import request from 'supertest';
import app from '../../../app';
import admin from 'firebase-admin';

// Ensure firebase-admin has minimal fields used by init helper when running tests
// and spy on auth() to provide mocked methods.

describe('auth register (admin-only)', () => {
  const createUserMock = jest.fn();
  const setCustomUserClaimsMock = jest.fn();

  beforeAll(() => {
    // Ensure apps array exists so initFirebase doesn't throw
    // @ts-ignore
    if (!admin.apps) admin.apps = [];
    // @ts-ignore
    jest.spyOn(admin, 'auth').mockImplementation(() => ({ createUser: createUserMock, setCustomUserClaims: setCustomUserClaimsMock }));
  });

  beforeEach(() => {
    createUserMock.mockReset();
    setCustomUserClaimsMock.mockReset();
  });

  test('admin can create user', async () => {
    createUserMock.mockResolvedValue({ uid: 'u1', email: 'x@y.com', displayName: 'X' });
    setCustomUserClaimsMock.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/auth/users')
      .set('Authorization', 'Bearer test-admin')
      .send({ email: 'x@y.com', password: 'pass123', role: 'client', displayName: 'X' })
      .expect(201);

    expect(res.body).toHaveProperty('uid', 'u1');
    expect(res.body).toHaveProperty('email', 'x@y.com');
    expect(createUserMock).toHaveBeenCalled();
    expect(setCustomUserClaimsMock).toHaveBeenCalledWith('u1', { role: 'client' });
  });

  test('non-admin forbidden', async () => {
    await request(app)
      .post('/auth/users')
      .set('Authorization', 'Bearer test-client-123')
      .send({ email: 'y@z.com', password: 'p' })
      .expect(403);
  });

  test('service error returns 500', async () => {
    createUserMock.mockRejectedValue(new Error('boom'));
    await request(app)
      .post('/auth/users')
      .set('Authorization', 'Bearer test-admin')
      .send({ email: 'x@y.com', password: 'p', role: 'client' })
      .expect(500);
  });
});
