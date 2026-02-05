import { buildMonthlySeries } from "../queries";

test("builds 12-month series", () => {
  const series = buildMonthlySeries([], 2026);
  expect(series).toHaveLength(12);
});
