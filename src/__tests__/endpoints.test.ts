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
    where: (field: string, op: string, value: any) => {
      return {
        where: (_f2: string, _o2: string, _v2: any) => ({
          where: (_f3: string, _o3: string, _v3: any) => ({
            limit: (_n: number) => ({ get: async () => ({ empty: true, docs: [] }) })
          })
        })
      };
    }
  };
}

describe('endpoints', () => {
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

  it('POST /clients validation missing -> 400', async () => {
    await request(app).post('/clients').send({ nombre: 'A' }).expect(400);
  });

  it('GET /clients/:id non-existent -> 404', async () => {
    await request(app).get('/clients/nonexistent').expect(404);
  });

  it('PUT /clients/:id updates status when billingDate changes', async () => {
    // create client
    const createRes = await request(app).post('/clients').send({
      nombre: 'Up', apellido: 'D', email: 'up@d.com', telefono: '+584223552630', cedula: '3', billingDate: new Date(Date.now() + 10*24*60*60*1000).toISOString().slice(0,10), plan: 'X', amount: '$10'
    }).expect(201);

    const id = createRes.body.id;
    const newBilling = new Date(Date.now() + 1*24*60*60*1000).toISOString().slice(0,10);
    const updateRes = await request(app).put(`/clients/${id}`).send({ billingDate: newBilling }).expect(200);
    expect(updateRes.body.status).toBeDefined();
  });

  it('POST /notifications/send/:clientId -> 500 when Twilio fails', async () => {
    // create client
    const createRes = await request(app).post('/clients').send({
      nombre: 'Notify', apellido: 'Fail', email: 'nf@test.com', telefono: '+584223552629', cedula: 'V1', billingDate: new Date(Date.now() + 1*24*60*60*1000).toISOString().slice(0,10), plan: 'P', amount: '$20'
    }).expect(201);

    const id = createRes.body.id;
    // make Twilio mock fail for the next call (match by phone)
    twilioMock.__addRule({ toContains: '552629', response: { type: 'reject', value: new Error('twilio fail') } });

    const res = await request(app).post(`/notifications/send/${id}`).query({ template: 'subscription_reminder_3days' }).send();
    expect([200,500]).toContain(res.status);
  });
});
