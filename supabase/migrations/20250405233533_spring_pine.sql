/*
  # Add calculated_price column to order_items table

  1. Changes
    - Add calculated_price column to store the final price for custom-priced items
    - Add custom_input_value column to store user input for custom measurements
    - Add unit_label column to store the measurement unit
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to order_items table
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS calculated_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS custom_input_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS unit_label text;

-- Add comments for clarity
COMMENT ON COLUMN order_items.calculated_price IS 'Final calculated price for custom-priced items';
COMMENT ON COLUMN order_items.custom_input_value IS 'User input value for custom measurements';
COMMENT ON COLUMN order_items.unit_label IS 'Measurement unit label (e.g., m², kg)';