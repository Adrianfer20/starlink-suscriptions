import { getNotificationType } from './getNotificationType';

function asDate(str: string) {
  return new Date(str);
}

const cases: Array<{ billing: string; nowIso: string; expect: string | null; note?: string }> = [
  // 3 days before => reminder
  { billing: '2026-02-08', nowIso: '2026-02-05T10:00:00Z', expect: 'subscription_reminder_3days', note: '3 days before' },
  // same day before 21:00 Caracas (21:00 -04:00 = 01:00Z next day) -> careful: use a time before cutoff in Caracas
  { billing: '2026-02-05', nowIso: '2026-02-05T20:00:00-04:00', expect: 'subscription_cutoff_day', note: 'same day before cutoff' },
  // same day after cutoff -> suspended
  { billing: '2026-02-05', nowIso: '2026-02-06T02:30:00Z', expect: 'subscription_suspended_notice', note: 'after cutoff (UTC representation)' },
  // billing date in past -> suspended
  { billing: '2026-02-01', nowIso: '2026-02-05T12:00:00Z', expect: 'subscription_suspended_notice', note: 'past billing date' },
  // not within rules -> null
  { billing: '2026-02-20', nowIso: '2026-02-05T12:00:00Z', expect: null, note: 'far future' },
];

for (const c of cases) {
  const now = new Date(c.nowIso as string);
  const res = getNotificationType(c.billing, now as Date);
  const note = c.note ?? '';
  console.log(`${note.padEnd(24)} | billing=${c.billing} now=${c.nowIso} => ${res} ${res === c.expect ? '✓' : `✗ (expected ${c.expect})`}`);
}
