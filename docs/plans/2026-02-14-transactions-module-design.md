# Transactions Module Design

Date: 2026-02-14
Owner: TBD

## Summary
Build the full transactions module with a hybrid layout, modal-based entry, multi-currency support, per-user categories, and tags. The page will include monthly income/expense summary, category share, and trend visuals. Import and export are out of scope for this iteration.

## Goals
- Provide a fast add/edit/delete flow for transactions.
- Support per-user category management with ordering and deactivation.
- Support multi-currency input with base-currency normalization.
- Provide filters and grouped list for quick review.
- Show monthly summary, category share, and trend at the top.

## Non-Goals
- CSV or Excel import and export.
- Budget configuration and tracking.
- Cross-user shared categories.

## Decisions
- Use a hybrid layout (summary + filters + grouped list).
- Use a modal for add/edit.
- Keep multi-currency with `amount_base` and `profiles.base_currency`.
- Add per-user categories with their own table.
- Add `tags` to transactions.

## Data Model
### New table: `user_categories`
Fields:
- `id` uuid primary key
- `user_id` uuid references `auth.users(id)`
- `name` text not null
- `icon` text
- `type` text not null, `income` or `expense`
- `sort_order` int default 0
- `is_active` boolean default true
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

### Update `transactions`
- Replace `category_id` to reference `user_categories.id`
- Add `tags` as `text[]` default '{}'

### RLS
- `user_categories` policy: `user_id = auth.uid()` for all
- `transactions` policy remains `user_id = auth.uid()`

## Services and Queries
Provide a small data layer in `lib`:
- `listTransactions(filters)`
- `upsertTransaction(input)`
- `deleteTransaction(id)`
- `listCategories()`
- `upsertCategory(input)`
- `deactivateCategory(id)`

Use server actions or route handlers to keep credentials server only.

## Currency Normalization
- On create/update, read `profiles.base_currency`.
- Read the most recent `exchange_rates` for `occurred_at`.
- Compute `amount_base` on the server.
- If a rate is missing, set `amount_base = amount` and return a warning flag.

## UI Layout
### Header
- Monthly summary: income, expense, net.
- Category share chart.
- Monthly trend sparkline.

### Filters
- Date range.
- Type: income/expense.
- Category multi-select.
- Amount range.
- Tags input.

### List
- Group by day with daily subtotal.
- Row fields: category icon, name, amount, note, tags, date.
- Row actions: edit, delete.

### Add/Edit Modal
- Fields: type, amount, currency, date, category, tags, note.
- Show computed base amount when currency != base currency.
- Validate: amount > 0, category type matches selection, required fields.

### Category Management
- List with drag to reorder.
- Add/edit name, icon, type.
- Deactivate instead of delete when used by transactions.

## Error Handling
- Show errors as short toast messages.
- Map RLS errors to a clear "not authorized" message.
- Show a warning banner when exchange rate data is missing.

## Analytics and Reuse
- Reuse existing analytics logic where possible to keep dashboard and transactions consistent.
- Expose normalized fields for charts: `type`, `amount_base`, `occurred_at`.

## Testing
- Unit tests for data queries and summary computations.
- Component tests for list grouping and filters.
- Form tests for validation and edit mode.
- Playwright smoke test to add a transaction and see it in the list.

## Rollout
- Ship behind the existing `/transactions` route.
- Add seed data for local development if needed.
- Monitor error logs for rate lookup misses.
