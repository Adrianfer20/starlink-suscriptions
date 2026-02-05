// Replace file with a single canonical implementation
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type NotificationType = 'subscription_reminder_3days' | 'subscription_cutoff_day' | 'subscription_suspended_notice' | null;

function getCaracasDateString(now = new Date()): string {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' });
  return dtf.format(now);
}

function parseDateAtCaracasMidnight(dateStr: string): number {
  return Date.parse(`${dateStr}T00:00:00-04:00`);
}

function parseCutoffTimestamp(billingDate: string): number {
  return Date.parse(`${billingDate}T21:00:00-04:00`);
}

export function getNotificationType(billingDate: string, now = new Date()): NotificationType {
  if (!billingDate || typeof billingDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(billingDate)) return null;

  const todayCaracas = getCaracasDateString(now);
  const todayMidMs = parseDateAtCaracasMidnight(todayCaracas);
  const billingMidMs = parseDateAtCaracasMidnight(billingDate);
  const diffDays = Math.floor((billingMidMs - todayMidMs) / MS_PER_DAY);

  const cutoffMs = parseCutoffTimestamp(billingDate);
  const nowMs = now.getTime();

  if (diffDays === 3) return 'subscription_reminder_3days';
  if (diffDays === 0 && nowMs < cutoffMs) return 'subscription_cutoff_day';
  if (nowMs >= cutoffMs || diffDays < 0) return 'subscription_suspended_notice';

  return null;
}

export default getNotificationType;
