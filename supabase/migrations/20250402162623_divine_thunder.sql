/*
  # Update Driver Assignment Functions

  1. Changes
    - Add assigned_pickup_driver_id and assigned_dropoff_driver_id columns
    - Update driver assignment functions
    - Fix references to estimated_delivery
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add driver assignment columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'assigned_pickup_driver_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN assigned_pickup_driver_id uuid REFERENCES drivers(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'assigned_dropoff_driver_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN assigned_dropoff_driver_id uuid REFERENCES drivers(id);
  END IF;
END $$;

-- Create indexes for driver assignments
CREATE INDEX IF NOT EXISTS idx_orders_pickup_driver ON orders(assigned_pickup_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_dropoff_driver ON orders(assigned_dropoff_driver_id);

-- Update driver assignment function
CREATE OR REPLACE FUNCTION validate_driver_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Check pickup driver
  IF NEW.assigned_pickup_driver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM drivers 
      WHERE id = NEW.assigned_pickup_driver_id 
      AND status = true
    ) THEN
      RAISE EXCEPTION 'Pickup driver must be active to be assigned orders';
    END IF;
  END IF;

  -- Check dropoff driver
  IF NEW.assigned_dropoff_driver_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM drivers 
      WHERE id = NEW.assigned_dropoff_driver_id 
      AND status = true
    ) THEN
      RAISE EXCEPTION 'Dropoff driver must be active to be assigned orders';
    END IF;
  END IF;

  -- Check general driver (legacy)
  IF NEW.assigned_driver_id IS NOT NULL THEN
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

-- Add comments
COMMENT ON COLUMN orders.assigned_pickup_driver_id IS 'Reference to the driver assigned for pickup';
COMMENT ON COLUMN orders.assigned_dropoff_driver_id IS 'Reference to the driver assigned for delivery';