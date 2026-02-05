import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState";

test("renders empty state", () => {
  render(<EmptyState title="暂无数据" />);
  expect(screen.getByText("暂无数据")).toBeInTheDocument();
});
