import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import StatCards from "../StatCards";

const fromMock = vi.fn();
const selectTransactionsMock = vi.fn();
const gteMock = vi.fn();
const lteMock = vi.fn();
const selectGoalsMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

describe("StatCards", () => {
  beforeEach(() => {
    fromMock.mockReset();
    selectTransactionsMock.mockReset();
    gteMock.mockReset();
    lteMock.mockReset();
    selectGoalsMock.mockReset();

    lteMock.mockResolvedValue({ data: [], error: null });
    gteMock.mockReturnValue({ lte: lteMock });
    selectTransactionsMock.mockReturnValue({ gte: gteMock });
    selectGoalsMock.mockResolvedValue({ data: [], error: null });

    fromMock.mockImplementation((table: string) => {
      if (table === "transactions") {
        return { select: selectTransactionsMock };
      }
      if (table === "savings_goals") {
        return { select: selectGoalsMock };
      }
      return { select: vi.fn() };
    });
  });

  it("does not render goal progress card", async () => {
    render(<StatCards />);
    await waitFor(() => {
      expect(screen.queryByText("目标完成度")).toBeNull();
    });
  });
});
