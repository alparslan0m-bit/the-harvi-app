-- 20260501000006_refactor_payment_names.sql
BEGIN;

-- 1. Update Purchases Table (Rename Stripe columns to Generic)
ALTER TABLE public.purchases 
  RENAME COLUMN stripe_session_id TO payment_session_id;

ALTER TABLE public.purchases 
  RENAME COLUMN stripe_payment_intent TO payment_id;

-- Add provider column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='purchases' AND column_name='provider') THEN
    ALTER TABLE public.purchases ADD COLUMN provider TEXT NOT NULL DEFAULT 'manual';
  END IF;
END $$;

-- 2. Update Module Prices Table
ALTER TABLE public.module_prices 
  RENAME COLUMN stripe_product_id TO external_product_id;

ALTER TABLE public.module_prices 
  RENAME COLUMN stripe_price_id TO external_price_id;

-- Make them optional for manual grants
ALTER TABLE public.module_prices 
  ALTER COLUMN external_product_id DROP NOT NULL,
  ALTER COLUMN external_price_id DROP NOT NULL;

COMMIT;
