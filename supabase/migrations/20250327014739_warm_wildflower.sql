/*
  # Fix Order Status Constraint

  1. Changes
    - Drop existing status constraint
    - Add new status constraint with correct values
    - Add validation for orders with quotes
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing status constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'valid_order_status'
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT valid_order_status;
  END IF;
END $$;

-- Add new status constraint with all valid statuses
ALTER TABLE orders 
ADD CONSTRAINT valid_order_status 
CHECK (status IN (
  'arrived_at_facility',
  'processing',
  'ready_for_delivery',
  'cancelled'
));

-- Add comment explaining valid statuses
COMMENT ON CONSTRAINT valid_order_status ON orders IS 'Defines valid order status values';

-- Create function to validate order quote status if it doesn't exist
CREATE OR REPLACE FUNCTION validate_order_quote_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order has a pending quote
  IF EXISTS (
    SELECT 1 FROM custom_price_quotes
    WHERE order_id = NEW.id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Cannot process order with pending quote';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce quote status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'enforce_order_quote_status'
    AND tgrelid = 'orders'::regclass
  ) THEN
    CREATE TRIGGER enforce_order_quote_status
      BEFORE UPDATE OF status ON orders
      FOR EACH ROW
      WHEN (NEW.status = 'processing')
      EXECUTE FUNCTION validate_order_quote_status();
  END IF;
END $$;

-- Add comment explaining trigger purpose
COMMENT ON FUNCTION validate_order_quote_status IS 'Prevents orders with pending quotes from being processed';