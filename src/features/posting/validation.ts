import { POSTING_CONFIG, type PostingMode } from './postingConfig';

export function validatePostingRate(mode: PostingMode, engagement: 'short' | 'long' | null, value: string): { title: string; message: string } | null {
  const config = POSTING_CONFIG[mode];
  const amount = Number(value.replace(/[^0-9.]/g, ''));
  if (!value.trim() || Number.isNaN(amount) || amount <= 0) return { title: 'Valid Rate Required', message: config.invalidAmount };
  if (engagement === 'short' && amount < 600) return { title: 'Minimum Daily Rate', message: config.dailyMinimumMessage };
  if (engagement === 'long' && amount < 6500) return {
    title: config.monthlyMinimumTitle,
    message: 'Under Batas Kasambahay (RA 10361), monthly salary cannot be below ₱6,500/month.',
  };
  return null;
}
