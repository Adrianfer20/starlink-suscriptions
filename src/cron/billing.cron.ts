// Final clean version
import nodeCron from 'node-cron';
import initFirebase from '../config/firebase';
import env from '../config/env';
import { isoDate } from '../utils/date.utils';
import logger from '../utils/logger';
import { sendTemplateMessage } from '../modules/notifications/whatsapp.service';
import * as notificationService from '../modules/notifications/notification.service';
import templates from '../modules/notifications/template.mapper';
import { validateClientForTemplate } from '../modules/notifications/validator';
import { normalizeClientForTemplates } from '../modules/notifications/client.normalizer';
import getNotificationType from '../modules/notifications/getNotificationType';

const app = initFirebase();
const db = app.firestore();
const clientsCol = db.collection('clients');
const locksCol = db.collection('cron_locks');

const LOCK_ID = 'billing_lock';
const LOCK_TTL_SECONDS = 10 * 60; // 10 minutes

function genOwnerId() {
  return `${require('os').hostname()}-${process.pid}-${Math.random().toString(36).slice(2,8)}`;
}

async function acquireLock(ownerId: string, ttlSeconds = LOCK_TTL_SECONDS) {
  const lockRef = locksCol.doc(LOCK_ID);
  const now = Date.now();
  const expiresAt = new Date(now + ttlSeconds * 1000).toISOString();

  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(lockRef);
      if (!doc.exists) {
        tx.set(lockRef, { ownerId, expiresAt, createdAt: new Date().toISOString() });
        return;
      }
      const data: any = doc.data();
      const existingExpires = data?.expiresAt ? new Date(data.expiresAt).getTime() : 0;
      if (existingExpires < now) {
        tx.set(lockRef, { ownerId, expiresAt, takenAt: new Date().toISOString() });
        return;
      }
      throw new Error('LOCK_HELD');
    });
    return true;
  } catch (err: any) {
    if (err && err.message === 'LOCK_HELD') return false;
    throw err;
  }
}

async function releaseLock(ownerId: string) {
  const lockRef = locksCol.doc(LOCK_ID);
  try {
    await db.runTransaction(async (tx) => {
      const doc = await tx.get(lockRef);
      if (!doc.exists) return;
      const data: any = doc.data();
      if (data?.ownerId === ownerId) {
        await tx.delete(lockRef);
      }
    });
  } catch (err) {
    logger.warn('Failed to release cron lock', err);
  }
}

async function processBilling() {
  logger.info('Cron: starting billing check');
  const ownerId = genOwnerId();

  const got = await acquireLock(ownerId).catch(err => {
    logger.error('Failed to acquire cron lock', err);
    return false;
  });
  if (!got) {
    logger.info('Cron: another instance holds the lock, skipping run');
    return;
  }

  try {
    const snap = await clientsCol.get();
    const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

    const now = new Date();

    for (const c of all) {
      try {
        const clientNorm = normalizeClientForTemplates(c as Record<string, any>);
        // take billing date string as stored (prefer canonical english `billingDate`)
        const rawBilling = (clientNorm.billingDate || clientNorm.nextBillingDate || clientNorm.next_billing_date) as string | undefined;
        if (!rawBilling) continue;
        // normalize to YYYY-MM-DD (if ISO datetime provided, take the date part)
        const billingDateStr = (typeof rawBilling === 'string' && rawBilling.length >= 10) ? rawBilling.slice(0, 10) : String(rawBilling);
        const notifKey = getNotificationType(billingDateStr, now);

        if (!notifKey) continue;

        const map: Record<string, { alias: string; tplKey: string }> = {
          subscription_reminder_3days: { alias: 'REMINDER_3_DAYS', tplKey: 'subscription_reminder_3days' },
          subscription_cutoff_day: { alias: 'DUE_TODAY', tplKey: 'subscription_cutoff_day' },
          subscription_suspended_notice: { alias: 'SUSPENDED_NOTICE', tplKey: 'subscription_suspended_notice' },
        };

        const entry = map[notifKey];
        if (!entry) continue;

        const dateTag = billingDateStr;
        const alias = entry.alias;
        const tplKey = entry.tplKey;
        const retryMinutes = Number(env.notifications?.retryMinutes || 60);
        const canSend = await notificationService.shouldSendNotification(c.id, alias, dateTag, retryMinutes);
        if (!canSend) continue;

        const validation = validateClientForTemplate(tplKey, clientNorm as Record<string, any>);
        if (!validation.ok) {
          logger.warn('Skipping send - missing fields for template', { clientId: c.id, missing: validation.missing });
          await notificationService.logNotification({ clientId: c.id, type: alias, status: 'FAILED', detail: { missing: validation.missing }, sentAt: new Date().toISOString(), dateTag });
        } else {
          const tpl = templates[tplKey];
          const params = tpl.buildParams(clientNorm);
          const to = clientNorm.phone;
          const res = await sendTemplateMessage(to, { templateSid: tpl.templateSid, templateName: tpl.templateName }, params, tpl.language);
          await notificationService.logNotification({ clientId: c.id, type: alias, status: res.success ? 'SENT' : 'FAILED', detail: res, sentAt: new Date().toISOString(), dateTag });
        }
      } catch (err) {
        logger.error('error processing client in cron', err);
      }
    }
  } finally {
    logger.info('Cron: finished billing check');
    await releaseLock(ownerId);
  }
}

export const scheduleBillingCron = () => {
  // Schedule from env (default 0 8 * * *) in America/Caracas
  const schedule = String(env.cron?.schedule || '0 8 * * *');
  nodeCron.schedule(schedule, () => {
    processBilling().catch(err => logger.error('cron process error', err));
  }, {
    timezone: 'America/Caracas'
  });
};

// Export for manual invocation (Cloud Scheduler or tests)
export { processBilling };
