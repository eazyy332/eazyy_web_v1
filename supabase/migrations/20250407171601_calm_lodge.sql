/*
  # Add order_number to custom_price_quotes table

  1. Changes
    - Add order_number column to custom_price_quotes table
    - Add order_type column to track standard vs custom quote orders
    - Add facility_id column for facility assignment
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add order_number column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_price_quotes' AND column_name = 'order_number'
  ) THEN
    ALTER TABLE custom_price_quotes ADD COLUMN order_number text;
  END IF;
END $$;

-- Add order_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_price_quotes' AND column_name = 'order_type'
  ) THEN
    ALTER TABLE custom_price_quotes ADD COLUMN order_type text DEFAULT 'standard';
  END IF;
END $$;

-- Add facility_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'custom_price_quotes' AND column_name = 'facility_id'
  ) THEN
    ALTER TABLE custom_price_quotes ADD COLUMN facility_id uuid REFERENCES facilities(id);
  END IF;
END $$;

-- Add constraint for order_type
ALTER TABLE custom_price_quotes 
DROP CONSTRAINT IF EXISTS custom_price_quotes_order_type_check;

ALTER TABLE custom_price_quotes
ADD CONSTRAINT custom_price_quotes_order_type_check 
CHECK (order_type IN ('standard', 'custom_quote'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_custom_price_quotes_order_type ON custom_price_quotes(order_type);
CREATE INDEX IF NOT EXISTS idx_custom_price_quotes_facility_id ON custom_price_quotes(facility_id);

-- Add comments
COMMENT ON COLUMN custom_price_quotes.facility_id IS 'Reference to the facility assigned to handle this custom quote';