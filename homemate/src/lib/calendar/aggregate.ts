export function aggregateItemsByDate(
  items: Array<{ date: string; type: "event" | "memo"; title: string }>
) {
  return items.reduce<Record<string, typeof items>>((acc, item) => {
    acc[item.date] = acc[item.date] || [];
    acc[item.date].push(item);
    return acc;
  }, {});
}
