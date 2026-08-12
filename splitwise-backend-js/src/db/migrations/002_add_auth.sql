-- 002_add_auth.sql
-- Adds password storage so users can actually sign up / log in.
-- Nullable for now (in case you ever add social login later and
-- some users have no password) but signup always sets it.

ALTER TABLE users ADD COLUMN password_hash TEXT;
