/*
  # Add Pickup and Delivery Dates to Orders

  1. Changes
    - Add pickup_date and delivery_date columns
    - Update order_date to be pickup_date
    - Add proper constraints and validation
  
  2. Security
    - Maintain existing RLS policies
*/

-- First add the columns without NOT NULL constraint
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_date timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_date timestamptz;

-- Update existing orders to use order_date as pickup_date
UPDATE orders 
SET pickup_date = COALESCE(order_date, estimated_delivery, created_at)
WHERE pickup_date IS NULL;

-- Now that we've populated pickup_date, we can add the NOT NULL constraint
ALTER TABLE orders
  ALTER COLUMN pickup_date SET NOT NULL;

-- Add constraint to ensure delivery_date is after pickup_date when present
ALTER TABLE orders
  ADD CONSTRAINT valid_delivery_date 
  CHECK (delivery_date IS NULL OR delivery_date > pickup_date);

-- Add comment explaining date usage
COMMENT ON COLUMN orders.pickup_date IS 'Scheduled pickup date and time';
COMMENT ON COLUMN orders.delivery_date IS 'Scheduled delivery date and time for non-pickup orders';