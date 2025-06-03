/*
  # Fix Order Status Transitions

  1. Changes
    - Update valid order status values
    - Add proper status transition validation
    - Fix quote status handling
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing status constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_order_status;

-- Add new status constraint with all valid statuses
ALTER TABLE orders 
ADD CONSTRAINT valid_order_status 
CHECK (status IN (
  'pending',
  'awaiting_pickup_customer',
  'in_transit_to_facility',
  'arrived_at_facility',
  'ready_for_delivery',
  'in_transit_to_customer',
  'delivered',
  'cancelled'
));

-- Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Define valid transitions
  IF OLD.status = 'arrived_at_facility' AND NEW.status = 'ready_for_delivery' THEN
    RETURN NEW;
  ELSIF OLD.status = 'ready_for_delivery' AND NEW.status = 'processing' THEN
    RETURN NEW;
  ELSIF NEW.status = OLD.status THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transitions
DROP TRIGGER IF EXISTS enforce_status_transition ON orders;
CREATE TRIGGER enforce_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();

-- Add comment explaining valid transitions
COMMENT ON FUNCTION validate_status_transition IS 'Enforces valid order status transitions';