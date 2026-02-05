import { createClient, listClients, getClientById, updateClient, __setCollection } from '../client.service';

type Doc = { id: string; data: any };

function createMockCollection() {
  const store = new Map<string, any>();
  return {
    doc: (id?: string) => {
      const docId = id || Math.random().toString(36).slice(2, 9);
      return {
        set: async (payload: any, opts?: any) => {
          const existing = store.get(docId) || {};
          const merged = opts && opts.merge ? { ...existing, ...payload } : payload;
          store.set(docId, merged);
        },
        get: async () => {
          const data = store.get(docId);
          return { exists: !!data, data: () => data };
        }
      };
    },
    add: async (payload: any) => {
      const id = Math.random().toString(36).slice(2, 9);
      store.set(id, payload);
      return { id };
    },
    get: async () => {
      const docs: Doc[] = [];
      for (const [id, data] of store.entries()) docs.push({ id, data });
      return { docs: docs.map(d => ({ id: d.id, data: () => d.data })) };
    }
  };
}

describe('client.service', () => {
  let col: any;
  beforeEach(() => {
    col = createMockCollection();
    __setCollection(col);
  });

  it('creates and retrieves a client', async () => {
    const payload: any = {
      nombre: 'Juan',
      apellido: 'Perez',
      email: 'juan@example.com',
      telefono: '+584223552600',
      cedula: 'V12345678',
      billingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0,10)
    };
    const created = await createClient(payload);
    expect(created.id).toBeDefined();
    const fetched = await getClientById(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.email).toBe(payload.email);
  });

  it('lists clients', async () => {
    await createClient({ nombre: 'A', apellido: 'B', email: 'a@b.com', telefono: '+1', cedula: '1', billingDate: new Date().toISOString().slice(0,10) } as any);
    await createClient({ nombre: 'C', apellido: 'D', email: 'c@d.com', telefono: '+2', cedula: '2', billingDate: new Date().toISOString().slice(0,10) } as any);
    const all = await listClients();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('updates client and recomputes status', async () => {
    const billingDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
    const created = await createClient({ nombre: 'Up', apellido: 'D', email: 'up@d.com', telefono: '+3', cedula: '3', billingDate } as any);
    const newBilling = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().slice(0,10);
    const updated = await updateClient(created.id, { billingDate: newBilling } as any);
    expect(updated).not.toBeNull();
    expect(updated?.status).toBeDefined();
  });
});
