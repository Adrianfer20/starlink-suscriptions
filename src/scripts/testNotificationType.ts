import { getNotificationType } from '../modules/notifications/getNotificationType';

function isoLocal(date: Date) { return date.toISOString(); }

const now = new Date();
console.log('Now (local):', isoLocal(now));

const cases = [
  // billingDate 3 days ahead
  { billingDateOffsetDays: 3, expected: 'subscription_reminder_3days' },
  // billingDate today before 21:00: simulate now at 20:00 Caracas
  { billingDateOffsetDays: 0, nowOverride: new Date(new Date().toISOString().slice(0,10) + 'T20:00:00-04:00'), expected: 'subscription_cutoff_day' },
  // billingDate today after 21:00
  { billingDateOffsetDays: 0, nowOverride: new Date(new Date().toISOString().slice(0,10) + 'T22:00:00-04:00'), expected: 'subscription_suspended_notice' },
  // billingDate passed yesterday
  { billingDateOffsetDays: -1, expected: 'subscription_suspended_notice' },
  // billingDate in 5 days -> null
  { billingDateOffsetDays: 5, expected: null }
];

for (const c of cases) {
  const base = new Date();
  const billingDate = new Date(base.getTime() + c.billingDateOffsetDays * 24*60*60*1000);
  const billingIso = billingDate.toISOString().slice(0,10);
  const nowToUse = c.nowOverride || new Date();
  const res = getNotificationType(billingIso, nowToUse);
  console.log({ billingIso, now: isoLocal(nowToUse), result: res, expected: c.expected });
}
