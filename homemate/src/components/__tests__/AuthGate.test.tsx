import { render, screen } from "@testing-library/react";
import AuthGate from "../AuthGate";

test("renders login prompt when no user", () => {
  render(<AuthGate user={null}>content</AuthGate>);
  expect(screen.getByText("请先登录")).toBeInTheDocument();
});
