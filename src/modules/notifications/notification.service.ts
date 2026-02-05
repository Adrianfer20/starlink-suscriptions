import initFirebase from '../../config/firebase';
import logger from '../../utils/logger';

const app = initFirebase();
const db = app.firestore();
let collection = db.collection('notifications');

// Test hook: allow replacing collection (used by unit tests)
export const __setCollection = (col: any) => {
  collection = col;
};

export const logNotification = async (payload: { clientId: string; type: string; status: 'SENT' | 'FAILED'; detail?: any; sentAt?: string; dateTag?: string }) => {
  try {
    const now = new Date().toISOString();
    await collection.add({ ...payload, createdAt: now });
  } catch (err) {
    logger.error('log notification failed', err);
  }
};

export const existsNotification = async (clientId: string, type: string, dateTag: string) => {
  // dateTag can be used to avoid duplicates for same day/type
  const q = collection.where('clientId', '==', clientId).where('type', '==', type).where('dateTag','==', dateTag).limit(1);
  const snap = await q.get();
  return !snap.empty;
};

// Decide if we should send (allow retry when last was FAILED and older than retryMinutes)
export const shouldSendNotification = async (clientId: string, type: string, dateTag: string, retryMinutes = 60) => {
  const q = collection.where('clientId', '==', clientId).where('type', '==', type).where('dateTag','==', dateTag);
  // some test mocks expose a chain with `.limit(...).get()` instead of `.get()` directly
  let snap: any;
  if (q && typeof (q as any).get === 'function') {
    snap = await (q as any).get();
  } else if (q && typeof (q as any).limit === 'function') {
    snap = await (q as any).limit(10).get();
  } else {
    snap = { empty: true, docs: [] };
  }
  if (!snap || snap.empty) return true;

  // snap.docs may be plain objects in tests or DocumentSnapshots in runtime
  const docs = Array.isArray(snap.docs) ? snap.docs : [];
  // normalize to data objects
  const items = docs.map((d: any) => (typeof d.data === 'function' ? d.data() : d));
  if (items.length === 0) return true;

  // pick latest by createdAt
  const latest = items.reduce((a: any, b: any) => (new Date(a.createdAt) > new Date(b.createdAt) ? a : b));
  if (!latest.status) return true;
  if (latest.status === 'SENT') return false;
  if (latest.status === 'FAILED') {
    const created = new Date(latest.createdAt).getTime();
    const now = Date.now();
    return (now - created) > retryMinutes * 60 * 1000;
  }
  return true;
};
