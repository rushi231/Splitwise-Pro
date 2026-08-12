
-- Core schema: users, groups, and an event-sourced ledger.
-- Design note: do NOT store a mutable "balance" column anywhere.
-- Balances are always derived by replaying ledger_events for a group.
-- This gives  an audit trail for free and makes "why is my balance
-- wrong" debuggable, which a mutable-balance design can't do.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_currency TEXT NOT NULL DEFAULT 'USD',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, user_id)
);

-- The ledger. Every financial fact is an immutable, append-only event.
-- type = 'expense_added' | 'expense_edited' | 'expense_deleted' | 'settlement'
CREATE TABLE ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    -- who triggered this event
    created_by UUID NOT NULL REFERENCES users(id),
    -- idempotency: client supplies this, we reject duplicates
    idempotency_key TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (idempotency_key)
);

CREATE INDEX idx_ledger_events_group_id ON ledger_events(group_id);
CREATE INDEX idx_ledger_events_created_at ON ledger_events(group_id, created_at);

-- Recurring expense definitions (Pro feature: Phase 4).
-- A background job reads these and appends ledger_events on schedule.
CREATE TABLE recurring_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    currency TEXT NOT NULL,
    interval TEXT NOT NULL, -- 'weekly' | 'monthly'
    paid_by UUID NOT NULL REFERENCES users(id),
    split_rule JSONB NOT NULL, -- same shape as expense_added payload's splits
    next_run_at TIMESTAMPTZ NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
