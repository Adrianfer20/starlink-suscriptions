// Integration tests: start app (without server) and use Supertest

// Use advanced Twilio mock
jest.mock('../config/twilio', () => require('./mocks/twilio.mock'));

import request from 'supertest';
import app from '../app';
import { __setCollection as __setClients } from '../modules/clients/client.service';
import { __setCollection as __setNotifications } from '../modules/notifications/notification.service';
const twilioMock: any = require('./mocks/twilio.mock');

function createMockCollection() {
  const store: any[] = [];
  return {
    store,
    doc: (id?: string) => {
      const docId = id || Math.random().toString(36).slice(2, 9);
      return {
        set: async (payload: any, opts?: any) => {
          const existing = store.find(s => s.id === docId);
          const merged = opts && opts.merge ? { ...existing?.data, ...payload } : payload;
          const idx = store.findIndex(s => s.id === docId);
          if (idx >= 0) store[idx] = { id: docId, data: merged };
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
    where: (field: string, op: string, value: any) => {
      return {
        where: (f2: string, o2: string, v2: any) => ({
          where: (f3: string, o3: string, v3: any) => ({
            limit: (_n: number) => ({ get: async () => ({ empty: true, docs: [] }) })
          })
        })
      };
    }
  };
}

describe('integration api', () => {
  let clientsCol: any;
  let notifsCol: any;

  beforeEach(() => {
    clientsCol = createMockCollection();
    notifsCol = createMockCollection();
    __setClients(clientsCol);
    __setNotifications(notifsCol);
    twilioMock.__reset();
    twilioMock.__setDefaultResponse({ type: 'resolve', value: { sid: 'SM123' } });
  });

  it('creates client and sends notification', async () => {
    const payload = {
      nombre: 'Integration',
      apellido: 'Test',
      email: 'int@test.com',
      telefono: '+584223552628',
      cedula: 'V9999999',
      billingDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0,10),
      plan: 'Estándar',
      amount: '$75'
    };

    const resCreate = await request(app).post('/clients').set('Authorization', 'Bearer test-admin').send(payload).expect(201);
    expect(resCreate.body.id).toBeDefined();
    const id = resCreate.body.id;

    const resList = await request(app).get('/clients').set('Authorization', 'Bearer test-admin').expect(200);
    expect(Array.isArray(resList.body)).toBe(true);

    // Send notification using mapped template key (must exist in template.mapper)
    const resSend = await request(app).post(`/notifications/send/${id}`).set('Authorization','Bearer test-admin').query({ template: 'subscription_reminder_3days' }).send().expect(200);
    expect(resSend.body.success).toBe(true);
    expect(resSend.body.sid).toBe('SM123');

    // Ensure notification logged
    expect(notifsCol.store.length).toBeGreaterThanOrEqual(1);
  });
});
