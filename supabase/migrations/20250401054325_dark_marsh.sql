/*
  # Fix Order Number Duplicates

  1. Changes
    - Add unique constraint on order_number
    - Add index for faster lookups
    - Add comment explaining constraint
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add unique constraint on order_number if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE orders 
      ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;

-- Create index on order_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT orders_order_number_key ON orders IS 'Ensures order numbers are unique';