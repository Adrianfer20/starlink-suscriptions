// Tests to verify ownership behavior: clients can only access their own resources
import request from 'supertest';
import app from '../../../app';
import { __setCollection as __setClients } from '../client.service';

function createMockCollection() {
  const store: any[] = [];
  return {
    store,
    doc: (id?: string) => {
      const docId = id || Math.random().toString(36).slice(2, 9);
      return {
        set: async (payload: any, opts?: any) => {
          const existingIdx = store.findIndex(s => s.id === docId);
          const merged = opts && opts.merge ? { ...store[existingIdx]?.data, ...payload } : payload;
          if (existingIdx >= 0) store[existingIdx] = { id: docId, data: merged };
          else store.push({ id: docId, data: merged });
        },
        get: async () => {
          const found = store.find(s => s.id === docId);
          return { exists: !!found, data: () => found?.data };
        }
      };
    },
    add: async (payload: any) => {
      const id = Math.random().toString(36).slice(2, 9);
      store.push({ id, data: payload });
      return { id };
    },
    get: async () => ({ docs: store.map((d: any) => ({ id: d.id, data: () => d.data })) }),
    where: () => ({ where: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }) })
  };
}

describe('clients ownership', () => {
  let clientsCol: any;

  beforeEach(() => {
    clientsCol = createMockCollection();
    __setClients(clientsCol);
  });

  test('client with matching ownerUid can access resource', async () => {
    // admin creates client and assigns ownerUid
    const createRes = await request(app)
      .post('/clients')
      .set('Authorization', 'Bearer test-admin')
      .send({ nombre: 'Owned', apellido: 'User', email: 'o@u.com', telefono: '+584223552628', cedula: '1', billingDate: new Date().toISOString().slice(0,10), ownerUid: 'owner-123' })
      .expect(201);

    const id = createRes.body.id;

    // client with matching uid
    const res = await request(app).get(`/clients/${id}`).set('Authorization', 'Bearer test-client-owner-123');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', id);
  });

  test('client without matching ownerUid is forbidden', async () => {
    const createRes = await request(app)
      .post('/clients')
      .set('Authorization', 'Bearer test-admin')
      .send({ nombre: 'Other', apellido: 'User', email: 'o2@u.com', telefono: '+584223552629', cedula: '2', billingDate: new Date().toISOString().slice(0,10), ownerUid: 'owner-abc' })
      .expect(201);

    const id = createRes.body.id;

    // different client uid
    const res = await request(app).get(`/clients/${id}`).set('Authorization', 'Bearer test-client-other');
    expect(res.status).toBe(403);
  });
});
