/*
  # Fix Facility Assignment Function

  1. Changes
    - Replace point distance calculation with manual distance formula
    - Add proper type casting and error handling
    - Update trigger conditions
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS assign_nearest_facility CASCADE;

-- Create function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
  R float := 6371; -- Earth's radius in kilometers
  dlat float;
  dlon float;
  a float;
  c float;
  d float;
BEGIN
  -- Convert latitude and longitude from degrees to radians
  lat1 := radians(lat1);
  lon1 := radians(lon1);
  lat2 := radians(lat2);
  lon2 := radians(lon2);
  
  -- Haversine formula
  dlat := lat2 - lat1;
  dlon := lon2 - lon1;
  a := sin(dlat/2)^2 + cos(lat1) * cos(lat2) * sin(dlon/2)^2;
  c := 2 * asin(sqrt(a));
  d := R * c;
  
  RETURN d;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to assign nearest facility
CREATE OR REPLACE FUNCTION assign_nearest_facility()
RETURNS TRIGGER AS $$
DECLARE
  nearest_facility_id uuid;
  delivery_time time;
BEGIN
  -- Convert delivery time to time type
  delivery_time := NEW.estimated_delivery::time;

  -- Find the nearest facility that's open during the delivery time
  SELECT f.id INTO nearest_facility_id
  FROM facilities f
  WHERE f.status = true
    AND f.opening_hour <= delivery_time
    AND f.close_hour >= delivery_time
    -- Calculate distance using Haversine formula
    AND calculate_distance(
      f.latitude::float,
      f.longitude::float,
      NEW.latitude::float,
      NEW.longitude::float
    ) <= COALESCE(f.radius, 10)
  ORDER BY calculate_distance(
    f.latitude::float,
    f.longitude::float,
    NEW.latitude::float,
    NEW.longitude::float
  ) ASC
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

-- Add comments explaining the functions
COMMENT ON FUNCTION calculate_distance IS 'Calculates the distance between two points using the Haversine formula';
COMMENT ON FUNCTION assign_nearest_facility IS 'Automatically assigns the nearest available facility to an order based on delivery location and time';