import initFirebase from '../../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import { normalizeClientForTemplates } from '../notifications/client.normalizer';

export type ClientStatus = 'ACTIVE' | 'DUE_SOON' | 'SUSPENDED';

export interface Client {
  id: string;
  // canonical english fields
  name: string;
  lastName?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  billingDate?: string; // ISO date yyyy-mm-dd
  plan?: string;
  amount?: string;
  balance?: string;
  status: ClientStatus | string;
  createdAt: string;
  updatedAt: string;
}

const app = initFirebase();
const db = app.firestore();
let collection = db.collection('clients');

// Test hook: allow replacing collection (used by unit tests)
export const __setCollection = (col: any) => {
  collection = col;
};

function computeStatus(billingDateIso?: string): ClientStatus {
  if (!billingDateIso) return 'SUSPENDED';
  const today = new Date();
  today.setHours(0,0,0,0);
  const b = new Date(billingDateIso);
  b.setHours(0,0,0,0);
  const diff = Math.floor((b.getTime() - today.getTime()) / (1000*60*60*24));
  if (diff < 0) return 'SUSPENDED';
  if (diff <= 3) return 'DUE_SOON';
  return 'ACTIVE';
}

// Storage payload: only canonical English fields
function toStoragePayload(payload: Partial<Client>) {
  const out: Record<string, any> = {};
  if (payload.id) out.id = payload.id;
  if (payload.name) out.name = payload.name;
  if (payload.lastName) out.lastName = payload.lastName;
  if (payload.email) out.email = payload.email;
  if (payload.phone) out.phone = payload.phone;
  if (payload.idNumber) out.idNumber = payload.idNumber;
  if (payload.billingDate) out.billingDate = payload.billingDate;
  if (payload.plan) out.plan = payload.plan;
  if (payload.amount) out.amount = payload.amount;
  if (payload.balance) out.balance = payload.balance;
  if (payload.status) out.status = payload.status;
  if (payload.createdAt) out.createdAt = payload.createdAt;
  if (payload.updatedAt) out.updatedAt = payload.updatedAt;
  return out;
}

export const createClient = async (payload: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const status = payload.status ? payload.status : computeStatus(payload.billingDate);
  const doc = { id, ...payload, status, createdAt: now, updatedAt: now } as Client;
  const storage = toStoragePayload(doc);
  await collection.doc(id).set(storage);
  return doc;
};

export const listClients = async () => {
  const snap = await collection.get();
  return snap.docs.map(d => {
    const raw = d.data();
    const normalized = normalizeClientForTemplates(raw as Record<string, any>);
    // map normalized english keys to Client shape
    return {
      id: raw.id || d.id,
      name: normalized.name,
      lastName: normalized.lastName,
      email: normalized.email,
      phone: normalized.phone,
      idNumber: normalized.idNumber,
      billingDate: normalized.billingDate,
      plan: normalized.plan,
      amount: normalized.amount,
      balance: normalized.balance,
      status: raw.status || computeStatus(normalized.billingDate),
      createdAt: raw.createdAt || null,
      updatedAt: raw.updatedAt || null,
    } as Client;
  });
};

export const getClientById = async (id: string) => {
  const doc = await collection.doc(id).get();
  if (!doc.exists) return null;
  const raw = doc.data() as Record<string, any>;
  const normalized = normalizeClientForTemplates(raw || {});
  return {
    id: raw.id || doc.id,
    name: normalized.name,
    lastName: normalized.lastName,
    email: normalized.email,
    phone: normalized.phone,
    idNumber: normalized.idNumber,
    billingDate: normalized.billingDate,
    plan: normalized.plan,
    amount: normalized.amount,
    balance: normalized.balance,
    status: raw.status || computeStatus(normalized.billingDate),
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  } as Client;
};

export const updateClient = async (id: string, data: Partial<Client>) => {
  const now = new Date().toISOString();
  const updatePayload: any = { ...data, updatedAt: now };
  if (data.billingDate) {
    updatePayload.status = computeStatus(data.billingDate as string);
  }
  // write canonical + legacy spanish fields for compatibility
  const storage = toStoragePayload(updatePayload);
  await collection.doc(id).set(storage, { merge: true });
  const updated = await getClientById(id);
  return updated;
};
