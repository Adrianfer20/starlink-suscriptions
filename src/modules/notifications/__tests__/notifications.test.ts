import { logNotification, existsNotification, __setCollection } from '../notification.service';

type Doc = { id: string; data: any };

function createMockCollection() {
  const store: any[] = [];
  return {
    add: async (payload: any) => {
      store.push(payload);
      return { id: `${store.length - 1}` };
    },
    // test helper to insert a raw document (with createdAt control)
    insertRaw: async (payload: any) => {
      store.push(payload);
    },
    where: (field: string, op: string, value: any) => {
      return {
        where: (f2: string, o2: string, v2: any) => {
          return {
            where: (f3: string, o3: string, v3: any) => {
              const found = store.filter(s => s[field] === value && s[f2] === v2 && s[f3] === v3);
              return { limit: (_n: number) => ({ get: async () => ({ empty: found.length === 0, docs: found }) }) };
            }
          };
        }
      };
    }
  };
}

describe('notification.service', () => {
  let col: any;
  beforeEach(() => {
    col = createMockCollection();
    __setCollection(col);
    // ensure env default during tests
    process.env.NOTIF_RETRY_MINUTES = process.env.NOTIF_RETRY_MINUTES || '60';
  });

  it('logs a notification', async () => {
    await logNotification({ clientId: 'c1', type: 'REMINDER', status: 'SENT', sentAt: new Date().toISOString(), dateTag: '2026-02-05' });
    // no throw = success
  });

  it('checks existsNotification returns false when none', async () => {
    const exists = await existsNotification('c1', 'REMINDER', '2026-02-05');
    expect(exists).toBe(false);
  });

  it('shouldSendNotification allows send when none', async () => {
    // @ts-ignore
    const { shouldSendNotification } = await import('../notification.service');
    const ok = await shouldSendNotification('c1', 'REMINDER', '2026-02-05', 60);
    expect(ok).toBe(true);
  });

  it('shouldSendNotification blocks when last was SENT', async () => {
    await logNotification({ clientId: 'c1', type: 'REMINDER', status: 'SENT', sentAt: new Date().toISOString(), dateTag: '2026-02-05' });
    // @ts-ignore
    const { shouldSendNotification } = await import('../notification.service');
    const ok = await shouldSendNotification('c1', 'REMINDER', '2026-02-05', 60);
    expect(ok).toBe(false);
  });

  it('shouldSendNotification retries when FAILED older than threshold', async () => {
    // insert an old FAILED (simulate older than 61 minutes)
    const past = new Date(Date.now() - 61 * 60 * 1000).toISOString();
    // @ts-ignore
    await col.insertRaw({ clientId: 'c2', type: 'REMINDER', status: 'FAILED', createdAt: past, dateTag: '2026-02-05' });
    // @ts-ignore
    const { shouldSendNotification } = await import('../notification.service');
    const ok = await shouldSendNotification('c2', 'REMINDER', '2026-02-05', 60);
    expect(ok).toBe(true);
  });

  it('shouldSendNotification blocks when FAILED recent', async () => {
    const recent = new Date().toISOString();
    // @ts-ignore
    await col.insertRaw({ clientId: 'c3', type: 'REMINDER', status: 'FAILED', createdAt: recent, dateTag: '2026-02-05' });
    // @ts-ignore
    const { shouldSendNotification } = await import('../notification.service');
    const ok = await shouldSendNotification('c3', 'REMINDER', '2026-02-05', 60);
    expect(ok).toBe(false);
  });
});
