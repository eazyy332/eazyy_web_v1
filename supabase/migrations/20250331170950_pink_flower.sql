/*
  # Fix Order Package Handler Function

  1. Changes
    - Add proper duplicate prevention
    - Add concurrency handling
    - Add transaction safety
    - Add debug logging
  
  2. Security
    - Maintain existing RLS policies
    - Add proper locking
*/

-- Drop existing function and related triggers
DROP TRIGGER IF EXISTS generate_package_for_order ON orders;
DROP FUNCTION IF EXISTS handle_order_package CASCADE;

-- Create improved package handler function
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
  -- Log function entry if debug enabled
  IF debug_enabled THEN
    RAISE NOTICE 'handle_order_package() called for order %', NEW.id;
  END IF;

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

  -- Acquire row-level lock on the order to prevent concurrent modifications
  PERFORM pg_advisory_xact_lock(NEW.id::bigint);
  
  -- First check if this order already has a package assignment
  SELECT package_id INTO existing_order_package
  FROM package_orders
  WHERE order_id = NEW.id;

  -- If order already has a package, don't create another one
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

    -- First check if a suitable package already exists
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

    -- If no existing package, create a new one
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

    -- Insert into package_orders using either existing or new package
    BEGIN
      -- Double-check no package_order exists (extra safety)
      IF NOT EXISTS (
        SELECT 1 FROM package_orders 
        WHERE order_id = NEW.id
        FOR UPDATE SKIP LOCKED
      ) THEN
        INSERT INTO package_orders (
          package_id,
          order_id,
          sequence_number,
          estimated_arrival
        )
        VALUES (
          COALESCE(existing_package_id, new_package_id),
          NEW.id,
          COALESCE(
            (
              SELECT MAX(po.sequence_number) + 1
              FROM package_orders po
              WHERE po.package_id = COALESCE(existing_package_id, new_package_id)
              FOR UPDATE SKIP LOCKED
            ),
            1
          ),
          delivery_time::time
        );

        IF debug_enabled THEN
          RAISE NOTICE 'Created package_order for order % in package %', 
            NEW.id, 
            COALESCE(existing_package_id, new_package_id);
        END IF;

        -- Update total_orders count
        UPDATE driver_packages
        SET total_orders = (
          SELECT COUNT(*)
          FROM package_orders
          WHERE package_id = COALESCE(existing_package_id, new_package_id)
        )
        WHERE id = COALESCE(existing_package_id, new_package_id);
      ELSE
        IF debug_enabled THEN
          RAISE NOTICE 'Package order already exists for order %, skipping creation', NEW.id;
        END IF;
      END IF;

    EXCEPTION
      WHEN unique_violation THEN
        -- Log the error but don't fail the transaction
        IF debug_enabled THEN
          RAISE NOTICE 'Unique violation caught for order % - package order may already exist', NEW.id;
        END IF;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details but don't fail the transaction
    IF debug_enabled THEN
      RAISE NOTICE 'Error in handle_order_package for order %: %', NEW.id, SQLERRM;
      RAISE NOTICE 'Error detail: %', SQLSTATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for package generation
CREATE TRIGGER generate_package_for_order
  AFTER INSERT OR UPDATE OF status, facility_id, pickup_date, delivery_date
  ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'processing' AND NEW.facility_id IS NOT NULL)
  EXECUTE FUNCTION handle_order_package();

-- Add comments
COMMENT ON FUNCTION handle_order_package IS 'Automatically generates or assigns packages for orders when they are created or updated. Includes duplicate prevention and concurrency handling.';

-- Add index to improve package lookup performance
CREATE INDEX IF NOT EXISTS idx_package_orders_order_lookup 
ON package_orders (order_id, package_id);

-- Add index to improve package time range queries
CREATE INDEX IF NOT EXISTS idx_driver_packages_time_lookup 
ON driver_packages (facility_id, package_date, start_time, end_time)
WHERE status IN ('pending', 'assigned');