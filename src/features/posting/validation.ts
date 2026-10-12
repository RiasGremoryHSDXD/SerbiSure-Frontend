import { POSTING_CONFIG, type PostingMode } from './postingConfig';
import type { MinimumWageData } from '../bookings/api/bookingApi';

export function validatePostingRate(mode: PostingMode, engagement: 'short' | 'long' | null, value: string, policy: MinimumWageData): { title: string; message: string } | null {
  const amount = Number(value);
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()) || !Number.isFinite(amount) || amount <= 0 || amount > 999999.99)
    return { title: 'Valid Rate Required', message: POSTING_CONFIG[mode].invalidAmount };
  const period = engagement === 'long' ? 'month' : 'day';
  if (policy.rate_period !== period) return { title: 'Rate Policy Changed', message: 'Refresh the wage policy before continuing.' };
  if (amount < Number(policy.minimum_rate)) return { title: 'Minimum Compensation', message: policy.description || 'The rate is below the applicable minimum.' };
  return null;
}
