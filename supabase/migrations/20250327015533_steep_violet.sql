/*
  # Fix Order Quote Validation

  1. Changes
    - Drop existing trigger and function
    - Create new function using correct column references
    - Add proper validation for quote status
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS enforce_order_quote_status ON orders;
DROP FUNCTION IF EXISTS validate_order_quote_status();

-- Create function to validate quote status
CREATE OR REPLACE FUNCTION validate_order_quote_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order has a pending quote
  IF NEW.order_type = 'custom_quote' AND NEW.quote_status = 'pending' THEN
    RAISE EXCEPTION 'Cannot process order with pending quote';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce quote status
CREATE TRIGGER enforce_order_quote_status
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'processing')
  EXECUTE FUNCTION validate_order_quote_status();

-- Add comment explaining trigger purpose
COMMENT ON FUNCTION validate_order_quote_status IS 'Prevents orders with pending quotes from being processed';