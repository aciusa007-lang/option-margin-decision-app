# Option vs Margin Decision App

This is a standalone browser calculator for comparing three ideas:

- selling a covered call against shares you already own
- selling a cash-secured put to earn premium while waiting to buy
- using margin to keep or add stock exposure

## Files

- `index.html`
- `styles.css`
- `app.js`

## How to use

1. Open `index.html` in a web browser.
2. Enter your stock price, shares owned, option strikes and premiums, margin amount, margin rate, and expected stock price at expiration.
3. Review projected profit, annualized option yield, breakeven levels, and which strategy ranks highest under your assumptions.

## Notes

- Covered call assumes contracts are sold only on full 100-share lots.
- Cash-secured put uses the same number of option contracts as your current share count would support.
- Margin carry assumes profit is based on the extra shares you buy with borrowed money and subtracts simple interest for the holding period.
- The calculator is for scenario analysis only. It does not include taxes, dividends, changing option Greeks, maintenance margin, or forced liquidation risk.
- To enable private cross-device sync with Supabase Auth, create the table and policies below in the Supabase SQL editor:

```sql
create table if not exists public.portfolio_state (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.portfolio_state enable row level security;

drop policy if exists "auth read portfolio_state" on public.portfolio_state;
create policy "auth read portfolio_state"
on public.portfolio_state
for select
to authenticated
using (id = auth.uid()::text);

drop policy if exists "auth insert portfolio_state" on public.portfolio_state;
create policy "auth insert portfolio_state"
on public.portfolio_state
for insert
to authenticated
with check (id = auth.uid()::text);

drop policy if exists "auth update portfolio_state" on public.portfolio_state;
create policy "auth update portfolio_state"
on public.portfolio_state
for update
to authenticated
using (id = auth.uid()::text)
with check (id = auth.uid()::text);

drop policy if exists "anon read portfolio_state" on public.portfolio_state;
drop policy if exists "anon insert portfolio_state" on public.portfolio_state;
drop policy if exists "anon update portfolio_state" on public.portfolio_state;
```
