import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import TransactionsPage from "./page";

const { mockTransactions, mockCategories } = vi.hoisted(() => ({
  mockTransactions: [
    {
      id: "tx-1",
      user_id: "user-1",
      category_id: null,
      amount: 10,
      amount_base: 10,
      currency: "CNY",
      type: "expense",
      occurred_at: "2026-02-14",
      note: null,
      tags: [],
    },
  ],
  mockCategories: [
    {
      id: "cat-1",
      user_id: "user-1",
      name: "餐饮",
      type: "expense",
      sort_order: 0,
      is_active: true,
    },
  ],
}));

vi.mock("@/app/transactions/actions", () => ({
  getTransactionsData: vi.fn().mockResolvedValue({
    transactions: mockTransactions,
    categories: mockCategories,
  }),
}));

vi.mock("@/components/transactions/TransactionsPageClient", () => ({
  default: ({ initialTransactions, initialCategories }: any) => (
    <div data-testid="transactions-client">
      {initialTransactions.length}/{initialCategories.length}
    </div>
  ),
}));

describe("TransactionsPage", () => {
  it("passes server data to client component", async () => {
    const page = await TransactionsPage();
    render(page as React.ReactElement);
    expect(screen.getByTestId("transactions-client")).toHaveTextContent("1/1");
  });
});
