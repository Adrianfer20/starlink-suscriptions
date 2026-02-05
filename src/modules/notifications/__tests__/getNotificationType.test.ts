import getNotificationType from '../getNotificationType';

describe('getNotificationType', () => {
  test('3 days before returns reminder', () => {
    const billing = '2026-02-08';
    const now = new Date('2026-02-05T10:00:00Z');
    expect(getNotificationType(billing, now)).toBe('subscription_reminder_3days');
  });

  test('same day before cutoff returns cutoff_day', () => {
    const billing = '2026-02-05';
    // 20:00 Caracas is before 21:00 cutoff
    const now = new Date('2026-02-05T20:00:00-04:00');
    expect(getNotificationType(billing, now)).toBe('subscription_cutoff_day');
  });

  test('same day after cutoff returns suspended', () => {
    const billing = '2026-02-05';
    const now = new Date('2026-02-06T02:30:00Z');
    expect(getNotificationType(billing, now)).toBe('subscription_suspended_notice');
  });

  test('past billing returns suspended', () => {
    const billing = '2026-02-01';
    const now = new Date('2026-02-05T12:00:00Z');
    expect(getNotificationType(billing, now)).toBe('subscription_suspended_notice');
  });

  test('far future returns null', () => {
    const billing = '2026-02-20';
    const now = new Date('2026-02-05T12:00:00Z');
    expect(getNotificationType(billing, now)).toBeNull();
  });
});
