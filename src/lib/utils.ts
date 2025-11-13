export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'm';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'k';
  } else {
    return num.toString();
  }
}