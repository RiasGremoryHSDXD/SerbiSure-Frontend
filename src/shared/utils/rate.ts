export function formatRate(value: unknown, prefix = '₱'): string {
  if (typeof value !== 'number' && typeof value !== 'string') return 'Rate not provided';
  const raw = String(value).trim();
  return /^\d+(?:\.\d{1,2})?$/.test(raw) && Number.isFinite(Number(raw)) && Number(raw) > 0
    ? `${prefix}${raw}` : 'Rate not provided';
}
