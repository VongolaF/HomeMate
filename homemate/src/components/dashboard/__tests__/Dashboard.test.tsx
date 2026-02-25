import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import Dashboard from "../Dashboard";

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

vi.mock("../StatCards", () => ({
  default: function StatCardsMock() {
    return <div>本月概览</div>;
  },
}));

vi.mock("../SavingsGoalsSummaryCard", () => ({
  default: function SavingsGoalsSummaryCardMock() {
    return <div>存钱目标</div>;
  },
}));

vi.mock("../DashboardCalendar", () => ({
  default: function DashboardCalendarMock() {
    return <div>日历提醒</div>;
  },
}));

vi.mock("../MonthlyTrendChart", () => ({
  default: function MonthlyTrendChartMock() {
    return null;
  },
}));

test("renders dashboard sections", () => {
  render(<Dashboard />);
  expect(screen.getByText("本月概览")).toBeInTheDocument();
  expect(screen.getByText("存钱目标")).toBeInTheDocument();
  expect(screen.getByText("日历提醒")).toBeInTheDocument();
});
