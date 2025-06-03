/*
  # Fix Facility Assignment Function

  1. Changes
    - Drop existing function
    - Create new function with proper facility selection logic
    - Add trigger to automatically assign nearest facility
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS assign_nearest_facility CASCADE;

-- Create function to assign nearest facility
CREATE OR REPLACE FUNCTION assign_nearest_facility()
RETURNS TRIGGER AS $$
DECLARE
  nearest_facility_id uuid;
BEGIN
  -- Find the nearest facility that's open during the delivery time
  SELECT f.id INTO nearest_facility_id
  FROM facilities f
  WHERE f.status = true
    AND f.opening_hour <= (NEW.estimated_delivery::time)
    AND f.close_hour >= (NEW.estimated_delivery::time)
    -- Calculate distance using latitude and longitude
    AND (
      point(f.longitude::float, f.latitude::float) <@> 
      point(NEW.longitude::float, NEW.latitude::float)
    ) <= COALESCE(f.radius, 10)
  ORDER BY 
    point(f.longitude::float, f.latitude::float) <@> 
    point(NEW.longitude::float, NEW.latitude::float)
  LIMIT 1;

  IF nearest_facility_id IS NULL THEN
    RAISE EXCEPTION 'No facility available for the specified delivery time';
  END IF;

  NEW.facility_id = nearest_facility_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace trigger
DROP TRIGGER IF EXISTS assign_facility_trigger ON orders;

CREATE TRIGGER assign_facility_trigger
  BEFORE INSERT OR UPDATE OF shipping_address, estimated_delivery
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_nearest_facility();

-- Add comment explaining the function
COMMENT ON FUNCTION assign_nearest_facility IS 'Automatically assigns the nearest available facility to an order based on delivery location and time';