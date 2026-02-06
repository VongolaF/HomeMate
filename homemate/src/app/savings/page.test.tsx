import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import SavingsPage from "./page";

const fromMock = vi.fn();
const selectMock = vi.fn();
const orderMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "user-1" }, loading: false }),
}));

describe("SavingsPage", () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectMock.mockReset();
    orderMock.mockReset();

    orderMock.mockResolvedValue({ data: [], error: null });
    selectMock.mockReturnValue({ order: orderMock });
    fromMock.mockReturnValue({ select: selectMock });
  });

  it("renders grouped savings sections", async () => {
    render(<SavingsPage />);
    expect(await screen.findByText("短期目标")).toBeInTheDocument();
    expect(screen.getByText("长期目标")).toBeInTheDocument();
    expect(screen.getByText("无截止日期")).toBeInTheDocument();
  });
});
