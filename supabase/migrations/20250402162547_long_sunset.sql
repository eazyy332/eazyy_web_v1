/*
  # Update Order Assignment Functions

  1. Changes
    - Update handle_new_order_assignment function
    - Update handle_order_assignment function
    - Fix references to estimated_delivery
  
  2. Security
    - Maintain existing RLS policies
*/

-- Update handle_new_order_assignment function
CREATE OR REPLACE FUNCTION handle_new_order_assignment()
RETURNS TRIGGER AS $$
DECLARE
  nearest_facility_id uuid;
  available_driver_id uuid;
  delivery_time timestamptz;
BEGIN
  -- Skip if already assigned
  IF NEW.facility_id IS NOT NULL OR NEW.assigned_driver_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Use delivery_date if available, otherwise use pickup_date
  delivery_time := COALESCE(NEW.delivery_date, NEW.pickup_date);

  -- Find nearest facility
  SELECT f.id INTO nearest_facility_id
  FROM facilities f
  WHERE f.status = true
    AND f.opening_hour <= delivery_time::time
    AND f.close_hour >= delivery_time::time
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

  -- Find available driver
  IF nearest_facility_id IS NOT NULL THEN
    SELECT d.id INTO available_driver_id
    FROM drivers d
    JOIN facility_drivers fd ON d.id = fd.driver_id
    WHERE fd.facility_id = nearest_facility_id
      AND d.status = true
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.assigned_driver_id = d.id
        AND o.status IN ('awaiting_pickup_customer', 'in_transit_to_facility')
      )
    LIMIT 1;
  END IF;

  -- Assign facility and driver if available
  NEW.facility_id = nearest_facility_id;
  NEW.assigned_driver_id = available_driver_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update handle_order_assignment function
CREATE OR REPLACE FUNCTION handle_order_assignment()
RETURNS TRIGGER AS $$
DECLARE
  nearest_facility_id uuid;
  available_driver_id uuid;
  delivery_time timestamptz;
BEGIN
  -- Skip if already assigned or not pending
  IF NEW.status != 'pending' OR NEW.facility_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Use delivery_date if available, otherwise use pickup_date
  delivery_time := COALESCE(NEW.delivery_date, NEW.pickup_date);

  -- Find nearest facility
  SELECT f.id INTO nearest_facility_id
  FROM facilities f
  WHERE f.status = true
    AND f.opening_hour <= delivery_time::time
    AND f.close_hour >= delivery_time::time
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

  -- Assign facility if found
  IF nearest_facility_id IS NOT NULL THEN
    NEW.facility_id = nearest_facility_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update or create triggers
DROP TRIGGER IF EXISTS assign_new_order ON orders;
CREATE TRIGGER assign_new_order
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_order_assignment();

DROP TRIGGER IF EXISTS auto_assign_order ON orders;
CREATE TRIGGER auto_assign_order
  BEFORE INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  WHEN ((NEW.status = 'pending') AND (NEW.facility_id IS NULL))
  EXECUTE FUNCTION handle_order_assignment();

-- Add comments
COMMENT ON FUNCTION handle_new_order_assignment IS 'Automatically assigns facility and driver to new orders';
COMMENT ON FUNCTION handle_order_assignment IS 'Automatically assigns orders to nearest facility';