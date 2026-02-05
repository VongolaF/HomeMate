export function buildMonthlySeries(rows: Array<{ month: number; total: number }>, year: number) {
  const map = new Map(rows.map((r) => [r.month, r.total]));
  return Array.from({ length: 12 }, (_, i) => ({
    year,
    month: i + 1,
    total: map.get(i + 1) ?? 0,
  }));
}
