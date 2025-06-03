/*
  # Create Discrepancy Items Table

  1. New Table
    - `discrepancy_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `original_order_item_id` (uuid, references order_items)
      - `product_name` (text)
      - `expected_quantity` (integer)
      - `actual_quantity` (integer)
      - `unit_price` (numeric)
      - `service_type` (text)
      - `notes` (text)
      - `photo_url` (text)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `is_temporary` (boolean)

  2. Security
    - Enable RLS
    - Add policies for facility staff
    - Add policy for service role
*/

-- Create discrepancy_items table
CREATE TABLE IF NOT EXISTS discrepancy_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  original_order_item_id uuid REFERENCES order_items(id),
  product_name text NOT NULL,
  expected_quantity integer,
  actual_quantity integer NOT NULL,
  unit_price numeric(10,2),
  service_type text,
  notes text,
  photo_url text,
  status text NOT NULL DEFAULT 'reported_by_facility',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_temporary boolean NOT NULL DEFAULT false,
  
  -- Add constraints
  CONSTRAINT valid_discrepancy_status CHECK (
    status IN ('reported_by_facility', 'awaiting_admin_review', 'awaiting_customer_reply', 'resolved_by_customer', 'resolved_by_admin')
  ),
  CONSTRAINT valid_quantities CHECK (
    expected_quantity IS NULL OR actual_quantity IS NOT NULL
  )
);

-- Create indexes if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_discrepancy_items_order_id') THEN
    CREATE INDEX idx_discrepancy_items_order_id ON discrepancy_items(order_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_discrepancy_items_created_at') THEN
    CREATE INDEX idx_discrepancy_items_created_at ON discrepancy_items(created_at DESC);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_discrepancy_items_status') THEN
    CREATE INDEX idx_discrepancy_items_status ON discrepancy_items(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_discrepancy_items_temporary') THEN
    CREATE INDEX idx_discrepancy_items_temporary ON discrepancy_items(is_temporary) WHERE is_temporary = true;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE discrepancy_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discrepancy_items' AND policyname = 'Facility staff can create discrepancies') THEN
    DROP POLICY "Facility staff can create discrepancies" ON discrepancy_items;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discrepancy_items' AND policyname = 'Facility staff can read discrepancies') THEN
    DROP POLICY "Facility staff can read discrepancies" ON discrepancy_items;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'discrepancy_items' AND policyname = 'Service role can do everything with discrepancies') THEN
    DROP POLICY "Service role can do everything with discrepancies" ON discrepancy_items;
  END IF;
END $$;

-- Create policies
CREATE POLICY "Facility staff can create discrepancies"
  ON discrepancy_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = discrepancy_items.order_id
    AND orders.facility_id IN (
      SELECT facilities.id
      FROM facilities
      WHERE facilities.auth_id = auth.uid()
    )
  ));

CREATE POLICY "Facility staff can read discrepancies"
  ON discrepancy_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = discrepancy_items.order_id
    AND orders.facility_id IN (
      SELECT facilities.id
      FROM facilities
      WHERE facilities.auth_id = auth.uid()
    )
  ));

CREATE POLICY "Service role can do everything with discrepancies"
  ON discrepancy_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create trigger for updated_at if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'discrepancy_items_updated_at') THEN
    CREATE TRIGGER discrepancy_items_updated_at
      BEFORE UPDATE ON discrepancy_items
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- Add temporary column to order_items if it doesn't exist
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false;

-- Create index for temporary items if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_temporary') THEN
    CREATE INDEX idx_order_items_temporary ON order_items(is_temporary) WHERE is_temporary = true;
  END IF;
END $$;

-- Add columns to order_items if they don't exist
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS service_type text,
  ADD COLUMN IF NOT EXISTS actual_quantity integer,
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id),
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS service_name text;

-- Add constraint for actual_quantity if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_actual_quantity') THEN
    ALTER TABLE order_items
      ADD CONSTRAINT valid_actual_quantity CHECK (
        actual_quantity IS NULL OR actual_quantity >= 0
      );
  END IF;
END $$;

-- Create indexes for new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_category') THEN
    CREATE INDEX idx_order_items_category ON order_items(category_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_service') THEN
    CREATE INDEX idx_order_items_service ON order_items(service_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_service_category') THEN
    CREATE INDEX idx_order_items_service_category ON order_items(service_id, category_id);
  END IF;
END $$;

-- Add has_discrepancy column to orders if it doesn't exist
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS has_discrepancy boolean NOT NULL DEFAULT false;

-- Add discrepancy_status column to orders if it doesn't exist
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS discrepancy_status text;

-- Add constraint for discrepancy_status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'valid_discrepancy_status') THEN
    ALTER TABLE orders
      ADD CONSTRAINT valid_discrepancy_status CHECK (
        discrepancy_status IS NULL OR discrepancy_status IN (
          'reported_by_facility', 
          'awaiting_admin_review', 
          'awaiting_customer_reply', 
          'resolved_by_customer', 
          'resolved_by_admin'
        )
      );
  END IF;
END $$;

-- Create function to maintain order item names if it doesn't exist
CREATE OR REPLACE FUNCTION update_order_item_names()
RETURNS TRIGGER AS $$
BEGIN
  -- Update service_name and category_name if service_id or category_id changes
  IF TG_OP = 'INSERT' OR NEW.service_id IS DISTINCT FROM OLD.service_id OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    -- Get service name
    IF NEW.service_id IS NOT NULL THEN
      SELECT name INTO NEW.service_name
      FROM services
      WHERE id = NEW.service_id;
    END IF;
    
    -- Get category name
    IF NEW.category_id IS NOT NULL THEN
      SELECT name INTO NEW.category_name
      FROM categories
      WHERE id = NEW.category_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for maintaining order item names if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'maintain_order_item_names') THEN
    CREATE TRIGGER maintain_order_item_names
      BEFORE INSERT OR UPDATE OF service_id, category_id
      ON order_items
      FOR EACH ROW
      EXECUTE FUNCTION update_order_item_names();
  END IF;
END $$;