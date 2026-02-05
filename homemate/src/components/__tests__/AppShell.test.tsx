import { render, screen } from "@testing-library/react";
import AppShell from "../AppShell";

test("renders app shell", () => {
  render(<AppShell><div>content</div></AppShell>);
  expect(screen.getByText("HomeMate")).toBeInTheDocument();
});
