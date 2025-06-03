/*
  # Fix Order Type Validation

  1. Changes
    - Add type column with proper validation
    - Add driver and facility tracking columns
    - Update constraints for order workflow
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing type constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_order_type;

-- Add or modify type column with proper validation
DO $$ 
BEGIN
  -- Add type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'type'
  ) THEN
    ALTER TABLE orders ADD COLUMN type text DEFAULT 'delivery';
  END IF;

  -- Update type validation
  ALTER TABLE orders ADD CONSTRAINT valid_order_type 
    CHECK (type IN ('pickup', 'delivery'));

  -- Add comment
  COMMENT ON COLUMN orders.type IS 'Type of order - pickup or delivery';
END $$;

-- Add or update workflow tracking columns
DO $$ 
BEGIN
  -- Add assigned_driver_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'assigned_driver_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN assigned_driver_id uuid REFERENCES drivers(id);
  END IF;

  -- Add facility_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'facility_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN facility_id uuid REFERENCES facilities(id);
  END IF;

  -- Add workflow state columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'is_pickup_completed'
  ) THEN
    ALTER TABLE orders ADD COLUMN is_pickup_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'is_facility_processing'
  ) THEN
    ALTER TABLE orders ADD COLUMN is_facility_processing boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'is_dropoff_completed'
  ) THEN
    ALTER TABLE orders ADD COLUMN is_dropoff_completed boolean DEFAULT false;
  END IF;
END $$;

-- Create or update workflow state constraints
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_pickup_state;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_processing_state;

ALTER TABLE orders
  ADD CONSTRAINT valid_pickup_state 
    CHECK ((NOT is_facility_processing OR is_pickup_completed) AND 
           (NOT is_dropoff_completed OR is_pickup_completed)),
  ADD CONSTRAINT valid_processing_state 
    CHECK (NOT is_dropoff_completed OR NOT is_facility_processing);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_workflow_state 
  ON orders(is_pickup_completed, is_facility_processing, is_dropoff_completed);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver 
  ON orders(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_facility 
  ON orders(facility_id);