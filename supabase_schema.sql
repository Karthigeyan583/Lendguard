-- ========================================================================
-- LendGuard - Supabase (PostgreSQL) Schema & Security Controls
-- Includes Row-Level Security (RLS) & Relational Integrity
-- ========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. LOANS TABLE
create table if not exists public.loans (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null check (type in ('lent', 'borrowed')),
    borrower_name text not null,
    borrower_phone text,
    borrower_email text,
    tag text default 'Personal',
    principal numeric(14, 2) not null check (principal > 0),
    currency text default '$',
    interest_type text not null default 'none' check (interest_type in ('none', 'simple', 'monthly', 'compound', 'fixed_fee')),
    interest_rate numeric(8, 2) default 0,
    start_date date not null default current_date,
    due_date date,
    tenure_months integer default 3,
    notes text,
    status text not null default 'active' check (status in ('active', 'partially_paid', 'overdue', 'settled', 'forgiven')),
    created_at timestamptz default timezone('utc'::text, now()) not null,
    updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- 2. PAYMENTS (REPAYMENTS) TABLE
create table if not exists public.payments (
    id text primary key,
    loan_id text references public.loans(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    amount numeric(14, 2) not null check (amount > 0),
    payment_date date not null default current_date,
    method text default 'Bank Transfer',
    notes text,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

-- 3. AUDIT LOGS (TAMPER-EVIDENT LEDGER)
create table if not exists public.audit_logs (
    id text primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    action text not null,
    details text not null,
    prev_hash text not null,
    hash text not null,
    timestamp timestamptz default timezone('utc'::text, now()) not null
);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) - ZERO DATA LEAKAGE
-- Only authenticated users can access their own financial records
-- ========================================================================

alter table public.loans enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- Loans RLS Policies
create policy "Users can view only their own loans"
    on public.loans for select
    using (auth.uid() = user_id);

create policy "Users can insert their own loans"
    on public.loans for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own loans"
    on public.loans for update
    using (auth.uid() = user_id);

create policy "Users can delete their own loans"
    on public.loans for delete
    using (auth.uid() = user_id);

-- Payments RLS Policies
create policy "Users can view their own loan payments"
    on public.payments for select
    using (auth.uid() = user_id);

create policy "Users can insert their own loan payments"
    on public.payments for insert
    with check (auth.uid() = user_id);

create policy "Users can delete their own loan payments"
    on public.payments for delete
    using (auth.uid() = user_id);

-- Audit Logs RLS Policies
create policy "Users can view their own audit logs"
    on public.audit_logs for select
    using (auth.uid() = user_id);

create policy "Users can append their own audit logs"
    on public.audit_logs for insert
    with check (auth.uid() = user_id);

-- Fast Indexing for Instant Retrieval
create index if not exists idx_loans_user_id on public.loans(user_id);
create index if not exists idx_loans_status on public.loans(status);
create index if not exists idx_payments_loan_id on public.payments(loan_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_audit_user_id on public.audit_logs(user_id);
