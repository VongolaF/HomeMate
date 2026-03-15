import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("@/components/analytics/YearlyIncomeExpenseChart", () => ({
  default: () => <div>YearlyIncomeExpenseChart</div>,
}));

vi.mock("@/components/analytics/YearlyNetTrendChart", () => ({
  default: () => <div>YearlyNetTrendChart</div>,
}));

vi.mock("@/components/analytics/MonthlyTopExpenseCategories", () => ({
  default: () => <div>MonthlyTopExpenseCategories</div>,
}));

vi.mock("@/components/analytics/MonthlyTopIncomeCategories", () => ({
  default: () => <div>MonthlyTopIncomeCategories</div>,
}));

vi.mock("@/components/analytics/YearlyIncomeExpenseRatioDonut", () => ({
  default: () => <div>YearlyIncomeExpenseRatioDonut</div>,
}));

vi.mock("@/components/analytics/BalanceRateCards", () => ({
  default: () => <div>BalanceRateCards</div>,
}));

vi.mock("@/components/analytics/SpendInsightsMoM", () => ({
  default: () => <div>SpendInsightsMoM</div>,
}));

vi.mock("@/components/dashboard/MonthlyTrendChart", () => ({
  default: () => <div>MonthlyTrendChart</div>,
}));

import AnalyticsPage from "./page";

describe("AnalyticsPage", () => {
  it("renders analytics title", () => {
    render(<AnalyticsPage />);
    expect(screen.getByText("统计报表")).toBeInTheDocument();
  });
});
