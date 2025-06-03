/*
  # Add Estimated Time Columns to Orders Table

  1. Changes
    - Add estimated_pickup_time and estimated_dropoff_time columns
    - These store the time strings separately from the date fields
    - Update related functions and triggers
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add estimated time columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'estimated_pickup_time'
  ) THEN
    ALTER TABLE orders ADD COLUMN estimated_pickup_time text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'estimated_dropoff_time'
  ) THEN
    ALTER TABLE orders ADD COLUMN estimated_dropoff_time text;
  END IF;
END $$;

-- Update QR code generation to include estimated times
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code = json_build_object(
    'order_number', NEW.order_number,
    'customer_name', NEW.customer_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'shipping_address', NEW.shipping_address,
    'shipping_method', NEW.shipping_method,
    'pickup_date', NEW.pickup_date,
    'delivery_date', NEW.delivery_date,
    'estimated_pickup_time', NEW.estimated_pickup_time,
    'estimated_dropoff_time', NEW.estimated_dropoff_time,
    'total_amount', NEW.total_amount,
    'status', NEW.status,
    'created_at', NEW.created_at
  )::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN orders.estimated_pickup_time IS 'Estimated time for pickup (HH:MM format)';
COMMENT ON COLUMN orders.estimated_dropoff_time IS 'Estimated time for delivery (HH:MM format)';