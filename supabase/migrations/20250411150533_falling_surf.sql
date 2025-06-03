/*
  # Add service and category columns to orders table

  1. Changes
    - Add service_id column to store the service used for the order
    - Add service_name column to store the service name for quick reference
    - Add category_id column to store the primary category of items
    - Add category_name column to store the category name for quick reference
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add service and category columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'service_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN service_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'service_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN service_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN category_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'category_name'
  ) THEN
    ALTER TABLE orders ADD COLUMN category_name text;
  END IF;
END $$;

-- Add foreign key constraints
ALTER TABLE orders
  ADD CONSTRAINT orders_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id);

ALTER TABLE orders
  ADD CONSTRAINT orders_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES categories(id);

-- Add comments
COMMENT ON COLUMN orders.service_id IS 'Reference to the service used for this order';
COMMENT ON COLUMN orders.service_name IS 'Name of the service for quick reference';
COMMENT ON COLUMN orders.category_id IS 'Reference to the primary category of items in this order';
COMMENT ON COLUMN orders.category_name IS 'Name of the category for quick reference';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_category_id ON orders(category_id);