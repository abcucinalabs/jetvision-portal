-- Migration: Unified request status flow + proposal builder columns
-- Date: 2026-02-25
-- Replaces the 5-value status enum with a 9-value unified flow that
-- drives the horizontal stepper UI on the per-request detail page.

-- 1. Drop the existing status CHECK constraint and add the new one
ALTER TABLE public.flight_requests
  DROP CONSTRAINT IF EXISTS flight_requests_status_check;

ALTER TABLE public.flight_requests
  ADD CONSTRAINT flight_requests_status_check
  CHECK (status IN (
    'pending',
    'under_review',
    'rfq_submitted',
    'quote_received',
    'proposal_ready',
    'proposal_sent',
    'accepted',
    'declined',
    'cancelled'
  ));

-- 2. Proposal builder fields (stored on the request record)
ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS iso_commission       NUMERIC;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS jetvision_cost       NUMERIC;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS proposal_notes       TEXT;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS selected_quote_id    TEXT;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS selected_quote_amount NUMERIC;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS total_price          NUMERIC;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS proposal_sent_at     TIMESTAMPTZ;

ALTER TABLE public.flight_requests
  ADD COLUMN IF NOT EXISTS client_decision_at   TIMESTAMPTZ;
