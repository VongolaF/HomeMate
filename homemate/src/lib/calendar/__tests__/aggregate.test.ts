import { aggregateItemsByDate } from "../aggregate";

test("aggregates items by date", () => {
  const data = aggregateItemsByDate([
    { date: "2026-02-05", type: "event", title: "A" },
    { date: "2026-02-05", type: "memo", title: "B" },
  ]);
  expect(data["2026-02-05"]).toHaveLength(2);
});
