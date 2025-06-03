/*
  # Fix Order Status Transitions

  1. Changes
    - Update existing orders to valid status first
    - Add new status constraint
    - Add status transition validation
  
  2. Security
    - Maintain existing RLS policies
*/

-- First update any invalid statuses to 'pending'
UPDATE orders SET status = 'pending' 
WHERE status NOT IN (
  'pending',
  'awaiting_pickup_customer',
  'in_transit_to_facility',
  'arrived_at_facility',
  'ready_for_delivery',
  'in_transit_to_customer',
  'delivered',
  'cancelled'
);

-- Drop existing status constraint and trigger
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_order_status;
DROP TRIGGER IF EXISTS enforce_status_transition ON orders;
DROP FUNCTION IF EXISTS validate_status_transition();

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
  -- Allow same status
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow transition to cancelled from any state
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status IN ('awaiting_pickup_customer', 'ready_for_delivery') THEN
        RETURN NEW;
      END IF;
    WHEN 'awaiting_pickup_customer' THEN
      IF NEW.status = 'in_transit_to_facility' THEN
        RETURN NEW;
      END IF;
    WHEN 'in_transit_to_facility' THEN
      IF NEW.status = 'arrived_at_facility' THEN
        RETURN NEW;
      END IF;
    WHEN 'arrived_at_facility' THEN
      IF NEW.status = 'ready_for_delivery' THEN
        RETURN NEW;
      END IF;
    WHEN 'ready_for_delivery' THEN
      IF NEW.status = 'in_transit_to_customer' THEN
        RETURN NEW;
      END IF;
    WHEN 'in_transit_to_customer' THEN
      IF NEW.status = 'delivered' THEN
        RETURN NEW;
      END IF;
  END CASE;

  RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status transitions
CREATE TRIGGER enforce_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();

-- Add comment explaining the workflow
COMMENT ON TABLE orders IS 'Orders table with status flow: awaiting_pickup_customer → in_transit_to_facility → arrived_at_facility → ready_for_delivery → in_transit_to_customer → delivered';