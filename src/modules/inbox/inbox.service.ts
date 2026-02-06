import initFirebase from '../../config/firebase';
import client from '../../config/twilio';
import env from '../../config/env';
import logger from '../../utils/logger';

const app = initFirebase();
const db = app.firestore();

const conversationsCol = db.collection('conversations');

// Messages are stored under `conversations/{conversationId}/messages` subcollections.
// This avoids composite index requirements and models the one-to-many
// relationship between a conversation and its messages.

const normalizeConversationId = (s?: any) => {
  if (!s) return '';
  let str = String(s);
  // remove spaces
  str = str.replace(/\s+/g, '');
  if (str.startsWith('whatsapp:')) {
    // ensure plus after colon
    if (!str.startsWith('whatsapp:+')) str = 'whatsapp:+' + str.slice('whatsapp:'.length);
    return str;
  }
  if (str.startsWith('+')) return 'whatsapp:' + str;
  if (/^\d+$/.test(str)) return 'whatsapp:+' + str;
  return str;
};

export const persistInbound = async (payload: { from?: string; to?: string; body?: string; sid?: string; raw?: any; timestamp?: string }) => {
  try {
    const now = payload.timestamp || new Date().toISOString();
    const rawFrom = payload.from || '';
    const rawTo = payload.to || '';
    const conversationId = normalizeConversationId(rawFrom);
    const from = normalizeConversationId(rawFrom);
    const to = normalizeConversationId(rawTo) || normalizeConversationId(payload.to);

    // Persist message in conversation subcollection
    const convRef = conversationsCol.doc(conversationId);
    await convRef.collection('messages').add({ conversationId, from: from || rawFrom, to: to || rawTo, body: payload.body, direction: 'in', timestamp: now, twilioMessageSid: payload.sid || null, raw: payload.raw || null });

    // Upsert conversation metadata
    const docRef = conversationsCol.doc(conversationId);
    await docRef.set({ phone: conversationId, lastMessage: payload.body || '', lastDirection: 'in', updatedAt: now }, { merge: true });
  } catch (err) {
    logger.error('persistInbound failed', err);
    throw err;
  }
};

export const listConversations = async (limit = 100) => {
  try {
    const q = conversationsCol.orderBy('updatedAt', 'desc').limit(limit);
    const snap = await q.get();
    return snap.docs.map((d: any) => (typeof d.data === 'function' ? d.data() : d));
  } catch (err) {
    logger.error('listConversations failed', err);
    return [];
  }
};

export const listMessages = async (conversationId: string) => {
  try {
    const convId = normalizeConversationId(conversationId);
    // Query the messages subcollection for this conversation
    const convRef = conversationsCol.doc(convId);
    let q: any = convRef.collection('messages');
    if (typeof q.orderBy === 'function') q = q.orderBy('timestamp', 'asc');
    const snap = await q.get();
    return snap.docs.map((d: any) => (typeof d.data === 'function' ? d.data() : d));
  } catch (err) {
    logger.error('listMessages failed', err);
    return [];
  }
};

export const sendMessage = async (conversationId: string, body: string) => {
  try {
    const from = env.twilio.whatsappFrom;
    const convId = normalizeConversationId(conversationId);
    const to = convId;
    const res: any = await client.messages.create({ from, to, body });

    const now = new Date().toISOString();


    // Persist outgoing message in conversation subcollection
    const convRef = conversationsCol.doc(convId);
    await convRef.collection('messages').add({ conversationId: convId, from, to, body, direction: 'out', timestamp: now, twilioMessageSid: res && res.sid ? res.sid : null });

    // Update conversation metadata
    const docRef = conversationsCol.doc(convId);
    await docRef.set({ phone: convId, lastMessage: body, lastDirection: 'out', updatedAt: now }, { merge: true });

    return { success: true, sid: res && res.sid };
  } catch (err) {
    logger.error('sendMessage failed', err);
    return { success: false, error: err };
  }
};
