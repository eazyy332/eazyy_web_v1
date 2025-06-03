/*
  # Add Pickup and Delivery Dates to Orders

  1. Changes
    - Drop dependent triggers first
    - Add new date columns
    - Migrate data
    - Recreate triggers with new columns
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop dependent triggers first
DROP TRIGGER IF EXISTS assign_facility_trigger ON orders;
DROP TRIGGER IF EXISTS generate_package_for_order ON orders;

-- Add new columns without NOT NULL constraint
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pickup_date timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_date timestamptz;

-- Update existing orders to use order_date as pickup_date
UPDATE orders 
SET 
  pickup_date = COALESCE(order_date, estimated_delivery, created_at),
  delivery_date = CASE 
    WHEN type = 'delivery' THEN estimated_delivery
    ELSE NULL
  END
WHERE pickup_date IS NULL;

-- Now that we've populated pickup_date, we can add the NOT NULL constraint
ALTER TABLE orders
  ALTER COLUMN pickup_date SET NOT NULL;

-- Add constraint to ensure delivery_date is after pickup_date when present
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS valid_delivery_date;

ALTER TABLE orders
  ADD CONSTRAINT valid_delivery_date 
  CHECK (delivery_date IS NULL OR delivery_date > pickup_date);

-- Update assign_facility_trigger to use new columns
CREATE OR REPLACE FUNCTION assign_nearest_facility()
RETURNS TRIGGER AS $$
DECLARE
  nearest_facility_id uuid;
  delivery_time time;
BEGIN
  -- Use delivery_date if available, otherwise use pickup_date
  delivery_time := COALESCE(NEW.delivery_date, NEW.pickup_date)::time;

  -- Find the nearest facility that's open during the delivery time
  SELECT f.id INTO nearest_facility_id
  FROM facilities f
  WHERE f.status = true
    AND f.opening_hour <= delivery_time
    AND f.close_hour >= delivery_time
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
    RAISE EXCEPTION 'No facility available for the specified time';
  END IF;

  NEW.facility_id = nearest_facility_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update package generation trigger
CREATE OR REPLACE FUNCTION handle_order_package()
RETURNS TRIGGER AS $$
BEGIN
  -- Create or update package based on order status and facility
  IF NEW.status = 'processing' AND NEW.facility_id IS NOT NULL THEN
    -- Find or create package for this time slot
    WITH new_package AS (
      INSERT INTO driver_packages (
        facility_id,
        package_date,
        start_time,
        end_time,
        total_orders,
        status
      )
      SELECT
        NEW.facility_id,
        COALESCE(NEW.delivery_date, NEW.pickup_date)::date,
        COALESCE(NEW.delivery_date, NEW.pickup_date)::time - interval '2 hours',
        COALESCE(NEW.delivery_date, NEW.pickup_date)::time + interval '2 hours',
        1,
        'pending'
      WHERE NOT EXISTS (
        SELECT 1 FROM driver_packages dp
        WHERE dp.facility_id = NEW.facility_id
        AND dp.package_date = COALESCE(NEW.delivery_date, NEW.pickup_date)::date
        AND dp.start_time <= COALESCE(NEW.delivery_date, NEW.pickup_date)::time
        AND dp.end_time >= COALESCE(NEW.delivery_date, NEW.pickup_date)::time
      )
      RETURNING id
    )
    INSERT INTO package_orders (
      package_id,
      order_id,
      sequence_number,
      estimated_arrival
    )
    SELECT
      COALESCE(
        (
          SELECT dp.id FROM driver_packages dp
          WHERE dp.facility_id = NEW.facility_id
          AND dp.package_date = COALESCE(NEW.delivery_date, NEW.pickup_date)::date
          AND dp.start_time <= COALESCE(NEW.delivery_date, NEW.pickup_date)::time
          AND dp.end_time >= COALESCE(NEW.delivery_date, NEW.pickup_date)::time
          LIMIT 1
        ),
        (SELECT id FROM new_package)
      ),
      NEW.id,
      COALESCE(
        (
          SELECT MAX(po.sequence_number) + 1
          FROM package_orders po
          WHERE po.package_id = (
            SELECT dp.id FROM driver_packages dp
            WHERE dp.facility_id = NEW.facility_id
            AND dp.package_date = COALESCE(NEW.delivery_date, NEW.pickup_date)::date
            AND dp.start_time <= COALESCE(NEW.delivery_date, NEW.pickup_date)::time
            AND dp.end_time >= COALESCE(NEW.delivery_date, NEW.pickup_date)::time
            LIMIT 1
          )
        ),
        1
      ),
      COALESCE(NEW.delivery_date, NEW.pickup_date)::time;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with new functions
CREATE TRIGGER assign_facility_trigger
  BEFORE INSERT OR UPDATE OF shipping_address, pickup_date, delivery_date
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_nearest_facility();

CREATE TRIGGER generate_package_for_order
  BEFORE INSERT OR UPDATE OF status, facility_id, pickup_date, delivery_date
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_package();

-- Now we can safely drop the old columns
ALTER TABLE orders
  DROP COLUMN IF EXISTS order_date,
  DROP COLUMN IF EXISTS estimated_delivery;

-- Add comments explaining date usage
COMMENT ON COLUMN orders.pickup_date IS 'Scheduled pickup date and time';
COMMENT ON COLUMN orders.delivery_date IS 'Scheduled delivery date and time for non-pickup orders';