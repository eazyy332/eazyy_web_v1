/*
  # Fix Duplicate Order Creation

  1. Changes
    - Add unique constraint on order_number
    - Add trigger to prevent duplicate orders
    - Update order handling functions
  
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

-- Update order status update trigger
CREATE OR REPLACE FUNCTION update_order_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    NEW.last_status_update = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order status updates
DROP TRIGGER IF EXISTS update_order_status_timestamp ON orders;
CREATE TRIGGER update_order_status_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_order_status_timestamp();

-- Update order state transition function
CREATE OR REPLACE FUNCTION handle_order_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate state transitions
  IF NEW.is_dropoff_completed AND NOT NEW.is_pickup_completed THEN
    RAISE EXCEPTION 'Cannot complete dropoff before pickup';
  END IF;
  
  IF NEW.is_facility_processing AND NOT NEW.is_pickup_completed THEN
    RAISE EXCEPTION 'Cannot start facility processing before pickup';
  END IF;

  -- Update status based on state
  IF NEW.is_dropoff_completed THEN
    NEW.status = 'delivered';
  ELSIF NEW.is_facility_processing THEN
    NEW.status = 'processing';
  ELSIF NEW.is_pickup_completed THEN
    NEW.status = 'picked_up';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order state transitions
DROP TRIGGER IF EXISTS order_state_transition_trigger ON orders;
CREATE TRIGGER order_state_transition_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_state_transition();

-- Update order type transition function
CREATE OR REPLACE FUNCTION handle_order_type_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate order type
  IF NEW.type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'Invalid order type. Must be either pickup or delivery';
  END IF;

  -- Set appropriate fields based on type
  IF NEW.type = 'pickup' THEN
    NEW.delivery_date = NULL;
    NEW.is_facility_processing = FALSE;
    NEW.is_dropoff_completed = FALSE;
  END IF;

  -- Reset workflow state when type changes
  IF TG_OP = 'UPDATE' AND NEW.type != OLD.type THEN
    NEW.is_pickup_completed = FALSE;
    NEW.is_facility_processing = FALSE;
    NEW.is_dropoff_completed = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order type transitions
DROP TRIGGER IF EXISTS order_type_transition_trigger ON orders;
CREATE TRIGGER order_type_transition_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_type_transition();

-- Update valid order status constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_order_status;
ALTER TABLE orders ADD CONSTRAINT valid_order_status 
  CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- Add comments
COMMENT ON CONSTRAINT orders_order_number_key ON orders IS 'Ensures order numbers are unique';
COMMENT ON COLUMN orders.last_status_update IS 'Timestamp of the last status change';