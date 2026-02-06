import { render, screen } from "@testing-library/react";
import Dashboard from "../Dashboard";

test("renders dashboard sections", () => {
  render(<Dashboard />);
  expect(screen.getByText("本月支出")).toBeInTheDocument();
  expect(screen.getByText("日历提醒")).toBeInTheDocument();
});
