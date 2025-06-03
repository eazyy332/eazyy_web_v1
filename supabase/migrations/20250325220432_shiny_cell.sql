/*
  # Fix Package Orders Query Ambiguity

  1. Changes
    - Add table aliases to resolve ambiguous column references
    - Update existing functions and triggers
    - Add proper comments
  
  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS validate_order_assignment CASCADE;
DROP FUNCTION IF EXISTS handle_order_package CASCADE;

-- Create function to validate order assignment
CREATE OR REPLACE FUNCTION validate_order_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order is already assigned to another package
  IF EXISTS (
    SELECT 1 FROM package_orders po2
    WHERE po2.order_id = NEW.order_id
    AND po2.id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Order is already assigned to another package';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle order package generation
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
        NEW.estimated_delivery::date,
        NEW.estimated_delivery::time - interval '2 hours',
        NEW.estimated_delivery::time + interval '2 hours',
        1,
        'pending'
      WHERE NOT EXISTS (
        SELECT 1 FROM driver_packages dp
        WHERE dp.facility_id = NEW.facility_id
        AND dp.package_date = NEW.estimated_delivery::date
        AND dp.start_time <= NEW.estimated_delivery::time
        AND dp.end_time >= NEW.estimated_delivery::time
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
          AND dp.package_date = NEW.estimated_delivery::date
          AND dp.start_time <= NEW.estimated_delivery::time
          AND dp.end_time >= NEW.estimated_delivery::time
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
            AND dp.package_date = NEW.estimated_delivery::date
            AND dp.start_time <= NEW.estimated_delivery::time
            AND dp.end_time >= NEW.estimated_delivery::time
            LIMIT 1
          )
        ),
        1
      ),
      NEW.estimated_delivery::time;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace triggers
DROP TRIGGER IF EXISTS enforce_order_assignment ON package_orders;
DROP TRIGGER IF EXISTS generate_package_for_order ON orders;

CREATE TRIGGER enforce_order_assignment
  BEFORE INSERT OR UPDATE ON package_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_assignment();

CREATE TRIGGER generate_package_for_order
  BEFORE INSERT OR UPDATE OF status, facility_id, estimated_delivery
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_package();

-- Add comments
COMMENT ON FUNCTION validate_order_assignment IS 'Ensures orders cannot be assigned to multiple packages';
COMMENT ON FUNCTION handle_order_package IS 'Automatically generates or assigns packages for orders when they are created or updated';