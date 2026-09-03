export function formatTimeAgo(date: string): string {
  const now = new Date().getTime();
  const posted = new Date(date).getTime();
  const diff = now - posted;
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diff / (1000 * 60));
  const diffSeconds = Math.floor(diff / 1000);

  if (diffDays > 0) {
    return `${diffDays} day ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hr ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} min ago`;
  }
  if (diffSeconds > 0) {
    return `${diffSeconds} sec ago`;
  }
  return 'just now';
}
