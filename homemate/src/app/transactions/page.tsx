import TransactionsPageClient from "@/components/transactions/TransactionsPageClient";
import { getTransactionsData } from "@/app/transactions/actions";

export default async function TransactionsPage() {
  const { transactions, categories } = await getTransactionsData({});

  return (
    <TransactionsPageClient
      initialTransactions={transactions}
      initialCategories={categories}
    />
  );
}
