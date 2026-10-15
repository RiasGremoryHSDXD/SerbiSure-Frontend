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
