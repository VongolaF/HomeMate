import { render, screen } from "@testing-library/react";
import TransactionsList from "../TransactionsList";
import type { Transaction, UserCategory } from "@/types/transactions";

const categories: UserCategory[] = [
  {
    id: "cat-food",
    user_id: "user-1",
    name: "餐饮",
    type: "expense",
    sort_order: 0,
    is_active: true,
  },
];

const transactions: Transaction[] = [
  {
    id: "tx-1",
    user_id: "user-1",
    category_id: "cat-food",
    amount: 30,
    amount_base: 30,
    currency: "CNY",
    type: "expense",
    occurred_at: "2026-02-14",
    note: "午饭",
    tags: ["外卖"],
  },
  {
    id: "tx-2",
    user_id: "user-1",
    category_id: null,
    amount: 20,
    amount_base: 20,
    currency: "CNY",
    type: "expense",
    occurred_at: "2026-02-14",
    note: "咖啡",
    tags: [],
  },
];

test("groups transactions by date and shows subtotal", () => {
  render(<TransactionsList transactions={transactions} categories={categories} />);

  expect(screen.getByText("2026-02-14")).toBeInTheDocument();
  expect(screen.getByText("合计 -¥50.00")).toBeInTheDocument();
  expect(screen.getByText("餐饮")).toBeInTheDocument();
  expect(screen.getByText("未分类")).toBeInTheDocument();
});
