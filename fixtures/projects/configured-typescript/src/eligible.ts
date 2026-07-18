export function classifyScore(score: number): string {
  if (score > 90) {
    return "excellent";
  }
  if (score > 70) {
    return "good";
  }
  if (score > 50) {
    return "fair";
  }
  return "needs-work";
}
