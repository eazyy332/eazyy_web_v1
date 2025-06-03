/*
  # Add Custom Pricing Support to Items Table

  1. Changes
    - Add custom_pricing flag to enable dynamic pricing based on user input
    - Add unit_label for measurement unit display (e.g., m², seats)
    - Add unit_price for price per unit calculation
    - Add min/max input validation values
    - Add input_placeholder for better UX
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add custom pricing columns to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS custom_pricing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS unit_label text,
  ADD COLUMN IF NOT EXISTS unit_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS min_input_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS max_input_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS input_placeholder text;

-- Drop constraints if they already exist to avoid errors
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_unit_price_positive') THEN
    ALTER TABLE items DROP CONSTRAINT check_unit_price_positive;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_min_max_values') THEN
    ALTER TABLE items DROP CONSTRAINT check_min_max_values;
  END IF;
END $$;

-- Add constraints for validation
ALTER TABLE items
  ADD CONSTRAINT check_unit_price_positive 
    CHECK (NOT custom_pricing OR unit_price IS NULL OR unit_price > 0),
  ADD CONSTRAINT check_min_max_values
    CHECK (NOT custom_pricing OR min_input_value IS NULL OR max_input_value IS NULL OR min_input_value <= max_input_value);

-- Add comments for clarity
COMMENT ON COLUMN items.custom_pricing IS 'Enables dynamic pricing based on user input';
COMMENT ON COLUMN items.unit_label IS 'Label for the measurement unit (e.g., m², seats)';
COMMENT ON COLUMN items.unit_price IS 'Price per unit for dynamic pricing';
COMMENT ON COLUMN items.min_input_value IS 'Minimum allowed value for user input';
COMMENT ON COLUMN items.max_input_value IS 'Maximum allowed value for user input';
COMMENT ON COLUMN items.input_placeholder IS 'Placeholder text for the input field';

-- Update existing items with custom pricing
UPDATE items
SET 
  custom_pricing = true,
  unit_label = 'm²',
  unit_price = 18.00,
  min_input_value = 0.1,
  max_input_value = 100.0,
  input_placeholder = 'Enter surface area in square meters'
WHERE 
  name = 'Carpet Cleaning' OR
  name LIKE '%Carpet%';

-- Insert carpet cleaning item if it doesn't exist
INSERT INTO items (
  category_id,
  name,
  description,
  price,
  is_custom_price,
  custom_pricing,
  unit_label,
  unit_price,
  min_input_value,
  max_input_value,
  input_placeholder,
  sequence,
  status
)
SELECT
  (SELECT id FROM categories WHERE name = 'Special Care' LIMIT 1),
  'Carpet Cleaning',
  'Professional deep cleaning for carpets and rugs',
  NULL,
  false,
  true,
  'm²',
  18.00,
  0.1,
  100.0,
  'Enter surface area in square meters',
  1,
  true
WHERE
  NOT EXISTS (
    SELECT 1 FROM items WHERE name = 'Carpet Cleaning'
  );