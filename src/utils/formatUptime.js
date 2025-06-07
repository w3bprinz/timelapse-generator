export function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  return `${days} Tage, ${hours % 24} Stunden, ${minutes % 60} Minuten, ${seconds % 60} Sekunden`;
}
