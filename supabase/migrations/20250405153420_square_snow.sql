/*
  # Fix quote_status constraint in orders table

  1. Changes
    - Modify the valid_quote_status constraint to allow NULL values
    - Update existing orders with NULL quote_status to use 'none'
    - Fix validation function to handle NULL values properly
  
  2. Security
    - Maintain existing RLS policies
*/

-- First update any NULL quote_status values to 'none'
UPDATE orders 
SET quote_status = 'none' 
WHERE quote_status IS NULL;

-- Drop existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_quote_status;

-- Add new constraint that allows NULL values
ALTER TABLE orders 
ADD CONSTRAINT valid_quote_status
CHECK (quote_status IS NULL OR quote_status IN ('none', 'pending', 'quoted', 'accepted', 'declined'));

-- Update quote status transition validation function
CREATE OR REPLACE FUNCTION validate_quote_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle NULL quote_status as 'none'
  IF NEW.quote_status IS NULL THEN
    NEW.quote_status := 'none';
  END IF;

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
    -- Standard orders should always have quote_status = 'none' or NULL
    IF NEW.quote_status != 'none' AND NEW.quote_status IS NOT NULL THEN
      RAISE EXCEPTION 'Standard orders cannot have quote status other than none';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger for quote status validation
DROP TRIGGER IF EXISTS enforce_quote_status_transition ON orders;
CREATE TRIGGER enforce_quote_status_transition
  BEFORE INSERT OR UPDATE OF quote_status, status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_quote_status_transition();

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT valid_quote_status ON orders IS 'Defines valid quote status values, allowing NULL';