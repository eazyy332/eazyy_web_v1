/*
  # Add Order Workflow State Management

  1. Changes
    - Add workflow state columns
    - Add driver and facility assignment
    - Add proper constraints and triggers
  
  2. Security
    - Maintain existing RLS policies
    - Add proper validation
*/

-- Drop existing constraints if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_pickup_state') THEN
    ALTER TABLE orders DROP CONSTRAINT valid_pickup_state;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_processing_state') THEN
    ALTER TABLE orders DROP CONSTRAINT valid_processing_state;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_order_type') THEN
    ALTER TABLE orders DROP CONSTRAINT valid_order_type;
  END IF;
END $$;

-- Add workflow state columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_pickup_completed') THEN
    ALTER TABLE orders ADD COLUMN is_pickup_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_facility_processing') THEN
    ALTER TABLE orders ADD COLUMN is_facility_processing boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_dropoff_completed') THEN
    ALTER TABLE orders ADD COLUMN is_dropoff_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'assigned_driver_id') THEN
    ALTER TABLE orders ADD COLUMN assigned_driver_id uuid REFERENCES drivers(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'facility_id') THEN
    ALTER TABLE orders ADD COLUMN facility_id uuid REFERENCES facilities(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'type') THEN
    ALTER TABLE orders ADD COLUMN type text DEFAULT 'delivery';
  END IF;
END $$;

-- Add workflow state constraints
ALTER TABLE orders
ADD CONSTRAINT valid_pickup_state CHECK (
  (NOT is_facility_processing OR is_pickup_completed) AND
  (NOT is_dropoff_completed OR is_pickup_completed)
),
ADD CONSTRAINT valid_processing_state CHECK (
  NOT is_dropoff_completed OR NOT is_facility_processing
),
ADD CONSTRAINT valid_order_type CHECK (
  type IN ('pickup', 'delivery')
);

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_orders_workflow_state;
DROP INDEX IF EXISTS idx_orders_assigned_driver;
DROP INDEX IF EXISTS idx_orders_facility;

-- Create indexes for workflow state and assignments
CREATE INDEX idx_orders_workflow_state ON orders(is_pickup_completed, is_facility_processing, is_dropoff_completed);
CREATE INDEX idx_orders_assigned_driver ON orders(assigned_driver_id);
CREATE INDEX idx_orders_facility ON orders(facility_id);

-- Drop existing functions and triggers if they exist
DROP TRIGGER IF EXISTS enforce_active_driver ON orders;
DROP TRIGGER IF EXISTS enforce_unique_driver_assignment ON orders;
DROP TRIGGER IF EXISTS order_state_transition_trigger ON orders;
DROP TRIGGER IF EXISTS order_type_transition_trigger ON orders;
DROP FUNCTION IF EXISTS validate_driver_status() CASCADE;
DROP FUNCTION IF EXISTS prevent_duplicate_driver_assignment() CASCADE;
DROP FUNCTION IF EXISTS handle_order_state_transition() CASCADE;
DROP FUNCTION IF EXISTS handle_order_type_transition() CASCADE;

-- Create function to validate driver status
CREATE FUNCTION validate_driver_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_driver_id IS NOT NULL THEN
    -- Check if driver exists and is active
    IF NOT EXISTS (
      SELECT 1 FROM drivers 
      WHERE id = NEW.assigned_driver_id 
      AND status = true
    ) THEN
      RAISE EXCEPTION 'Driver must be active to be assigned orders';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for driver status validation
CREATE TRIGGER enforce_active_driver
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_driver_status();

-- Create function to prevent duplicate driver assignments
CREATE FUNCTION prevent_duplicate_driver_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_driver_id IS NOT NULL AND 
     NEW.assigned_driver_id != OLD.assigned_driver_id AND
     EXISTS (
       SELECT 1 FROM orders
       WHERE assigned_driver_id = NEW.assigned_driver_id
       AND id != NEW.id
       AND status = 'processing'
     ) THEN
    RAISE EXCEPTION 'Driver is already assigned to another active order';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate driver assignment prevention
CREATE TRIGGER enforce_unique_driver_assignment
  BEFORE UPDATE OF assigned_driver_id ON orders
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_driver_assignment();

-- Create function to handle order state transitions
CREATE FUNCTION handle_order_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_status_update timestamp
  NEW.last_status_update = now();
  
  -- Validate state transitions
  IF NEW.is_dropoff_completed AND NOT NEW.is_pickup_completed THEN
    RAISE EXCEPTION 'Cannot complete dropoff before pickup';
  END IF;
  
  IF NEW.is_facility_processing AND NOT NEW.is_pickup_completed THEN
    RAISE EXCEPTION 'Cannot start facility processing before pickup';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order state transitions
CREATE TRIGGER order_state_transition_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_state_transition();

-- Create function to handle order type transitions
CREATE FUNCTION handle_order_type_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset workflow state when type changes
  IF TG_OP = 'UPDATE' AND NEW.type != OLD.type THEN
    NEW.is_pickup_completed = false;
    NEW.is_facility_processing = false;
    NEW.is_dropoff_completed = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order type transitions
CREATE TRIGGER order_type_transition_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_type_transition();

-- Add comment explaining workflow states
COMMENT ON COLUMN orders.is_pickup_completed IS 'Indicates if the driver has picked up the order from the customer';
COMMENT ON COLUMN orders.is_facility_processing IS 'Indicates if the facility is currently processing the order';
COMMENT ON COLUMN orders.is_dropoff_completed IS 'Indicates if the driver has completed the delivery back to the customer';
COMMENT ON COLUMN orders.assigned_driver_id IS 'Reference to the driver assigned to this order';
COMMENT ON COLUMN orders.facility_id IS 'Reference to the facility handling this order';
COMMENT ON COLUMN orders.type IS 'Type of order - pickup or delivery';