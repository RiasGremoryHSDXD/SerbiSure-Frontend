export function formatTimeAgo(dateString?: string) {
  if (!dateString) return 'Recently';
  const created = new Date(dateString).getTime();
  if (Number.isNaN(created)) return 'Recently';
  const minutes = Math.floor(Math.max(0, Date.now() - created) / 60000);
  if (minutes < 60) return `Posted ${Math.max(1, minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Posted ${hours}h ago`;
  return `Posted ${Math.floor(hours / 24)}d ago`;
}

// Feed timestamps stay compact in every language: 12h, 1d, 3d.
export function formatCompactTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  const created = new Date(dateString).getTime();
  if (!Number.isFinite(created)) return '';
  const minutes = Math.floor(Math.max(0, Date.now() - created) / 60000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
}
