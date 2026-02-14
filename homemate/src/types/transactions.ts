export type TransactionType = "income" | "expense";

export interface UserCategory {
  id: string;
  user_id: string;
  name: string;
  icon?: string | null;
  type: TransactionType;
  sort_order: number;
  is_active: boolean;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  currency: string;
  amount_base: number;
  type: TransactionType;
  occurred_at: string;
  note?: string | null;
  tags: string[];
}
