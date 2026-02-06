import initFirebase from '../../config/firebase';
import client from '../../config/twilio';
import env from '../../config/env';
import logger from '../../utils/logger';

const app = initFirebase();
const db = app.firestore();

const conversationsCol = db.collection('conversations');
const messagesCol = db.collection('messages');

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

    // save message in subcollection (preferred)
    try {
      const convRef = conversationsCol.doc(conversationId);
      await convRef.collection('messages').add({ conversationId, from: from || rawFrom, to: to || rawTo, body: payload.body, direction: 'in', timestamp: now, twilioMessageSid: payload.sid || null, raw: payload.raw || null });
    } catch (err) {
      logger.warn('failed to write subcollection message, falling back to top-level', err);
    }

    // Also write to top-level collection for compatibility
    await messagesCol.add({ conversationId, from: from || rawFrom, to: to || rawTo, body: payload.body, direction: 'in', timestamp: now, twilioMessageSid: payload.sid || null, raw: payload.raw || null });

    // upsert conversation (single doc)
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
    // Prefer subcollection under conversation doc (no composite index required)
    try {
      const convRef = conversationsCol.doc(convId);
      let q: any = convRef.collection('messages');
      if (typeof q.orderBy === 'function') q = q.orderBy('timestamp', 'asc');
      const snap = await q.get();
      return snap.docs.map((d: any) => (typeof d.data === 'function' ? d.data() : d));
    } catch (err) {
      logger.warn('failed to query subcollection messages, falling back to top-level', err);
    }

    // Fallback to top-level collection (may require index)
    let q2: any = messagesCol.where('conversationId', '==', convId);
    if (typeof messagesCol.orderBy === 'function') q2 = q2.orderBy('timestamp', 'asc');
    const snap2 = await q2.get();
    return snap2.docs.map((d: any) => (typeof d.data === 'function' ? d.data() : d));
  } catch (err) {
    logger.error('listMessages failed', err);
    return [];
  }
};

export const sendMessage = async (conversationId: string, body: string) => {
  try {
    const from = env.twilio.whatsappFrom;
    const to = conversationId;
    const res: any = await client.messages.create({ from, to, body });

    const now = new Date().toISOString();


    // persist outgoing message in subcollection (preferred)
    try {
      const convRef = conversationsCol.doc(conversationId);
      await convRef.collection('messages').add({ conversationId, from, to, body, direction: 'out', timestamp: now, twilioMessageSid: res && res.sid ? res.sid : null });
    } catch (err) {
      logger.warn('failed to write outgoing to subcollection, falling back to top-level', err);
    }

    // Also write to top-level collection for compatibility
    await messagesCol.add({ conversationId, from, to, body, direction: 'out', timestamp: now, twilioMessageSid: res && res.sid ? res.sid : null });

    // update conversation
    const docRef = conversationsCol.doc(conversationId);
    await docRef.set({ phone: conversationId, lastMessage: body, lastDirection: 'out', updatedAt: now }, { merge: true });

    return { success: true, sid: res && res.sid };
  } catch (err) {
    logger.error('sendMessage failed', err);
    return { success: false, error: err };
  }
};
