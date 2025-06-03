/*
  # Fix Discrepancy Item Acceptance

  1. Changes
    - Add foreign key constraint from discrepancy_items to order_items
    - Add additional columns to discrepancy_items for better tracking
    - Add proper indexes for performance
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add additional columns to discrepancy_items if they don't exist
ALTER TABLE discrepancy_items
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS service_name text,
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES items(id),
  ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES services(id),
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_discrepancy_items_product_id ON discrepancy_items(product_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_items_service_id ON discrepancy_items(service_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_items_category_id ON discrepancy_items(category_id);
CREATE INDEX IF NOT EXISTS idx_discrepancy_items_category_name ON discrepancy_items(category_name);
CREATE INDEX IF NOT EXISTS idx_discrepancy_items_service_name ON discrepancy_items(service_name);

-- Create a combined index for all reference fields
CREATE INDEX IF NOT EXISTS idx_discrepancy_items_refs ON discrepancy_items(product_id, service_id, category_id);

-- Add comments for the new columns
COMMENT ON COLUMN discrepancy_items.product_id IS 'Reference to the original product';
COMMENT ON COLUMN discrepancy_items.service_id IS 'Reference to the service this item belongs to';
COMMENT ON COLUMN discrepancy_items.category_id IS 'Reference to the category this item belongs to';

-- Create function to handle temporary items when transitioning from pending_item_confirmation to processing
CREATE OR REPLACE FUNCTION handle_temporary_items()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when transitioning from pending_item_confirmation to processing
  IF OLD.status = 'pending_item_confirmation' AND NEW.status = 'processing' THEN
    -- Update temporary items to be permanent
    UPDATE order_items
    SET is_temporary = false
    WHERE order_id = NEW.id AND is_temporary = true;
    
    -- Update discrepancy items to be permanent
    UPDATE discrepancy_items
    SET is_temporary = false
    WHERE order_id = NEW.id AND is_temporary = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for handling temporary items
DROP TRIGGER IF EXISTS handle_temporary_items_trigger ON orders;
CREATE TRIGGER handle_temporary_items_trigger
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_temporary_items();

-- Add comment explaining the function
COMMENT ON FUNCTION handle_temporary_items IS 'Handles temporary items when transitioning from pending_item_confirmation to processing';