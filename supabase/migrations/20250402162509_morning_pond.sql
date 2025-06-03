/*
  # Fix estimated_delivery references in functions and triggers

  1. Changes
    - Update all functions and triggers that reference estimated_delivery
    - Replace with delivery_date or pickup_date as appropriate
    - Fix order assignment and package generation logic
  
  2. Security
    - Maintain existing RLS policies
*/

-- Update assign_nearest_facility function
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

-- Update handle_order_package function
CREATE OR REPLACE FUNCTION handle_order_package()
RETURNS TRIGGER AS $$
DECLARE
  existing_package_id uuid;
  new_package_id uuid;
  delivery_time timestamptz;
  existing_order_package uuid;
  fields_changed boolean;
  debug_enabled boolean := true; -- Set to false in production
BEGIN
  -- For updates, check if relevant fields changed
  IF TG_OP = 'UPDATE' THEN
    fields_changed := (
      NEW.status != OLD.status OR
      NEW.facility_id IS DISTINCT FROM OLD.facility_id OR
      NEW.pickup_date != OLD.pickup_date OR
      NEW.delivery_date IS DISTINCT FROM OLD.delivery_date
    );
    
    -- Exit early if no relevant fields changed
    IF NOT fields_changed THEN
      IF debug_enabled THEN
        RAISE NOTICE 'No relevant fields changed, exiting early';
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- Acquire advisory lock for this order
  PERFORM pg_advisory_xact_lock(NEW.id::bigint);
  
  -- Check for existing package assignment
  SELECT package_id INTO existing_order_package
  FROM package_orders
  WHERE order_id = NEW.id
  FOR UPDATE SKIP LOCKED;

  -- Exit if order already has a package
  IF existing_order_package IS NOT NULL THEN
    IF debug_enabled THEN
      RAISE NOTICE 'Order % already has package %, exiting', NEW.id, existing_order_package;
    END IF;
    RETURN NEW;
  END IF;

  -- Only create package for processing orders with a facility
  IF NEW.status = 'processing' AND NEW.facility_id IS NOT NULL THEN
    -- Use delivery_date if available, otherwise use pickup_date
    delivery_time := COALESCE(NEW.delivery_date, NEW.pickup_date);

    IF debug_enabled THEN
      RAISE NOTICE 'Processing order % for delivery at %', NEW.id, delivery_time;
    END IF;

    -- Find existing suitable package
    SELECT dp.id INTO existing_package_id
    FROM driver_packages dp
    WHERE dp.facility_id = NEW.facility_id
      AND dp.package_date = delivery_time::date
      AND dp.start_time <= delivery_time::time
      AND dp.end_time >= delivery_time::time
      AND dp.status IN ('pending', 'assigned')
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF debug_enabled AND existing_package_id IS NOT NULL THEN
      RAISE NOTICE 'Found existing package % for order %', existing_package_id, NEW.id;
    END IF;

    -- Create new package if none exists
    IF existing_package_id IS NULL THEN
      INSERT INTO driver_packages (
        facility_id,
        package_date,
        start_time,
        end_time,
        total_orders,
        status
      ) VALUES (
        NEW.facility_id,
        delivery_time::date,
        delivery_time::time - interval '2 hours',
        delivery_time::time + interval '2 hours',
        1,
        'pending'
      )
      RETURNING id INTO new_package_id;

      IF debug_enabled THEN
        RAISE NOTICE 'Created new package % for order %', new_package_id, NEW.id;
      END IF;
    END IF;

    -- Create package order with duplicate prevention
    BEGIN
      WITH new_sequence AS (
        SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
        FROM package_orders
        WHERE package_id = COALESCE(existing_package_id, new_package_id)
        FOR UPDATE
      )
      INSERT INTO package_orders (
        package_id,
        order_id,
        sequence_number,
        estimated_arrival
      )
      SELECT
        COALESCE(existing_package_id, new_package_id),
        NEW.id,
        next_seq,
        delivery_time::time
      FROM new_sequence
      WHERE NOT EXISTS (
        SELECT 1 FROM package_orders WHERE order_id = NEW.id
      );

      -- Update total orders count
      UPDATE driver_packages
      SET total_orders = (
        SELECT COUNT(*)
        FROM package_orders
        WHERE package_id = COALESCE(existing_package_id, new_package_id)
      )
      WHERE id = COALESCE(existing_package_id, new_package_id);

    EXCEPTION
      WHEN unique_violation THEN
        IF debug_enabled THEN
          RAISE NOTICE 'Unique violation caught for order % - package order may already exist', NEW.id;
        END IF;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    IF debug_enabled THEN
      RAISE NOTICE 'Error in handle_order_package for order %: %', NEW.id, SQLERRM;
      RAISE NOTICE 'Error detail: %', SQLSTATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update generate_qr_code function if it exists
CREATE OR REPLACE FUNCTION generate_qr_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.qr_code = json_build_object(
    'order_number', NEW.order_number,
    'customer_name', NEW.customer_name,
    'email', NEW.email,
    'phone', NEW.phone,
    'shipping_address', NEW.shipping_address,
    'shipping_method', NEW.shipping_method,
    'pickup_date', NEW.pickup_date,
    'delivery_date', NEW.delivery_date,
    'total_amount', NEW.total_amount,
    'status', NEW.status,
    'created_at', NEW.created_at
  )::text;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update assign_facility_trigger
DROP TRIGGER IF EXISTS assign_facility_trigger ON orders;
CREATE TRIGGER assign_facility_trigger
  BEFORE INSERT OR UPDATE OF shipping_address, pickup_date, delivery_date
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_nearest_facility();

-- Update generate_package_for_order trigger
DROP TRIGGER IF EXISTS generate_package_for_order ON orders;
CREATE TRIGGER generate_package_for_order
  AFTER INSERT OR UPDATE OF status, facility_id, pickup_date, delivery_date
  ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'processing' AND NEW.facility_id IS NOT NULL)
  EXECUTE FUNCTION handle_order_package();

-- Add comments
COMMENT ON FUNCTION assign_nearest_facility IS 'Automatically assigns the nearest available facility to an order based on delivery location and time';
COMMENT ON FUNCTION handle_order_package IS 'Automatically generates or assigns packages for orders when they are created or updated. Includes duplicate prevention and concurrency handling.';
COMMENT ON FUNCTION generate_qr_code IS 'Generates a QR code JSON string for order tracking';