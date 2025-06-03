/*
  # Add Order Type and Quote Status Support

  1. New Columns
    - `order_type` to distinguish between standard and custom quote orders
    - `quote_status` to track custom quote workflow
    - Add proper constraints and defaults

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing type and status constraints if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_order_type'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT valid_order_type;
  END IF;

  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_quote_status'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT valid_quote_status;
  END IF;
END $$;

-- Add order_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders'
    AND column_name = 'order_type'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN order_type text DEFAULT 'standard';
  END IF;
END $$;

-- Add quote_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'orders'
    AND column_name = 'quote_status'
  ) THEN
    ALTER TABLE orders 
    ADD COLUMN quote_status text DEFAULT 'none';
  END IF;
END $$;

-- Add constraints
ALTER TABLE orders
ADD CONSTRAINT valid_order_type 
CHECK (order_type IN ('standard', 'custom_quote')),
ADD CONSTRAINT valid_quote_status
CHECK (quote_status IN ('none', 'pending', 'quoted', 'accepted', 'declined'));

-- Create function to validate quote status transitions
CREATE OR REPLACE FUNCTION validate_quote_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate for custom quote orders
  IF NEW.order_type = 'custom_quote' THEN
    -- Ensure quote status follows valid progression
    IF NEW.quote_status NOT IN ('pending', 'quoted', 'accepted', 'declined') THEN
      RAISE EXCEPTION 'Invalid quote status for custom quote order';
    END IF;

    -- Prevent processing orders with non-accepted quotes
    IF NEW.status = 'processing' AND NEW.quote_status != 'accepted' THEN
      RAISE EXCEPTION 'Cannot process order until quote is accepted';
    END IF;
  ELSE
    -- Standard orders should always have quote_status = 'none'
    IF NEW.quote_status != 'none' THEN
      RAISE EXCEPTION 'Standard orders cannot have quote status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quote status validation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'enforce_quote_status_transition'
    AND tgrelid = 'orders'::regclass
  ) THEN
    CREATE TRIGGER enforce_quote_status_transition
      BEFORE INSERT OR UPDATE OF quote_status, status ON orders
      FOR EACH ROW
      EXECUTE FUNCTION validate_quote_status_transition();
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN orders.order_type IS 'Type of order - standard or custom quote';
COMMENT ON COLUMN orders.quote_status IS 'Status of quote for custom quote orders';
COMMENT ON CONSTRAINT valid_order_type ON orders IS 'Ensures order type is either standard or custom quote';
COMMENT ON CONSTRAINT valid_quote_status ON orders IS 'Defines valid quote status values';
COMMENT ON FUNCTION validate_quote_status_transition IS 'Ensures quote status transitions follow valid workflow';