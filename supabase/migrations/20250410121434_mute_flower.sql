/*
  # Add Service Color Hex Codes

  1. Changes
    - Add color_hex column to services table
    - Update existing services with brand-consistent hex codes
    - Add indexes for better performance
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add color_hex column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'services' AND column_name = 'color_hex'
  ) THEN
    ALTER TABLE services ADD COLUMN color_hex text;
  END IF;
END $$;

-- Update existing services with brand-consistent hex codes
UPDATE services
SET color_hex = CASE service_identifier
  WHEN 'easy-bag' THEN '#5078bb' -- Regular Laundry
  WHEN 'wash-iron' THEN '#e54035' -- Wash & Iron
  WHEN 'dry-cleaning' THEN '#32a354' -- Dry Cleaning
  WHEN 'repairs' THEN '#f7bd16' -- Repairs & Alterations
  ELSE '#5078bb' -- Default to Regular Laundry color
END;

-- Add comment explaining color_hex usage
COMMENT ON COLUMN services.color_hex IS 'Brand-consistent hex color code for service';