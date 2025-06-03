/*
  # Add Foreign Key Constraint to discrepancy_items Table

  1. Changes
    - Add foreign key constraint between discrepancy_items.original_order_item_id and order_items.id
    - This enables proper relationship querying in the API
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'discrepancy_items_original_order_item_id_fkey'
  ) THEN
    ALTER TABLE discrepancy_items
    ADD CONSTRAINT discrepancy_items_original_order_item_id_fkey
    FOREIGN KEY (original_order_item_id)
    REFERENCES order_items(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_discrepancy_items_original_order_item_id 
ON discrepancy_items(original_order_item_id);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT discrepancy_items_original_order_item_id_fkey ON discrepancy_items 
IS 'Links discrepancy items to their original order items for proper relationship querying';