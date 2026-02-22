import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import TransactionsPage from "./page";

vi.mock("@/components/transactions/TransactionsPageClient", () => ({
  default: () => <div data-testid="transactions-client">ok</div>,
}));

describe("TransactionsPage", () => {
  it("renders client page", () => {
    render(<TransactionsPage />);
    expect(screen.getByTestId("transactions-client")).toHaveTextContent("ok");
  });
});
