import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("../AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

vi.mock("../HeaderBar", () => ({
  default: () => <div>HomeMate</div>,
}));

import AppShell from "../AppShell";

test("renders app shell", () => {
  render(<AppShell><div>content</div></AppShell>);
  expect(screen.getByText("HomeMate")).toBeInTheDocument();
});

test("does not render side nav on profile", () => {
  render(<AppShell><div>content</div></AppShell>);
  expect(screen.getByText("HomeMate")).toBeInTheDocument();
  expect(screen.queryByText("收起导航栏")).toBeNull();
});
