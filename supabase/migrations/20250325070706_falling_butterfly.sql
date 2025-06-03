/*
  # Add Required Coordinate Columns to Orders Table

  1. Changes
    - Add latitude and longitude columns
    - Add validation constraints for coordinates
    - Add index for coordinate-based queries
    - Handle existing constraints gracefully

  2. Security
    - Maintain existing RLS policies
*/

-- Add coordinate columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE orders ADD COLUMN latitude text NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE orders ADD COLUMN longitude text NOT NULL;
  END IF;
END $$;

-- Drop existing constraints if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_latitude'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT valid_latitude;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_longitude'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT valid_longitude;
  END IF;
END $$;

-- Add constraints to validate coordinates
ALTER TABLE orders
ADD CONSTRAINT valid_latitude CHECK (CAST(latitude AS numeric) >= -90 AND CAST(latitude AS numeric) <= 90),
ADD CONSTRAINT valid_longitude CHECK (CAST(longitude AS numeric) >= -180 AND CAST(longitude AS numeric) <= 180);

-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_orders_coordinates;

-- Create index for coordinate-based queries
CREATE INDEX idx_orders_coordinates ON orders(latitude, longitude);

-- Add comments explaining coordinate usage
COMMENT ON COLUMN orders.latitude IS 'Latitude coordinate for delivery location';
COMMENT ON COLUMN orders.longitude IS 'Longitude coordinate for delivery location';