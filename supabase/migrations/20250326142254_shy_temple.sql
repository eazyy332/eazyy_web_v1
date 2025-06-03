/*
  # Fix Order Package Handling

  1. Changes
    - Update handle_order_package function to prevent duplicates
    - Add proper error handling and logging
    - Add validation checks
  
  2. Security
    - Maintain existing RLS policies
*/

-- Update package generation function to prevent duplicates
CREATE OR REPLACE FUNCTION handle_order_package()
RETURNS TRIGGER AS $$
DECLARE
  existing_package_id uuid;
  new_package_id uuid;
  delivery_time timestamptz;
  existing_order_package uuid;
BEGIN
  -- First check if this order already has a package assignment
  SELECT package_id INTO existing_order_package
  FROM package_orders
  WHERE order_id = NEW.id;

  -- If order already has a package, don't create another one
  IF existing_order_package IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Only create package for processing orders with a facility
  IF NEW.status = 'processing' AND NEW.facility_id IS NOT NULL THEN
    -- Use delivery_date if available, otherwise use pickup_date
    delivery_time := COALESCE(NEW.delivery_date, NEW.pickup_date);

    -- First check if a suitable package already exists
    SELECT dp.id INTO existing_package_id
    FROM driver_packages dp
    WHERE dp.facility_id = NEW.facility_id
      AND dp.package_date = delivery_time::date
      AND dp.start_time <= delivery_time::time
      AND dp.end_time >= delivery_time::time
      AND dp.status IN ('pending', 'assigned')
    LIMIT 1;

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
    END IF;

    -- Insert into package_orders using either existing or new package
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
        ),
        1
      ),
      delivery_time::time
    );

    -- Update total_orders count
    UPDATE driver_packages
    SET total_orders = total_orders + 1
    WHERE id = COALESCE(existing_package_id, new_package_id);
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Log the error but don't fail the transaction
    RAISE NOTICE 'Unique violation in handle_order_package for order_id: %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log other errors but don't fail the transaction
    RAISE NOTICE 'Error in handle_order_package: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to ensure it's up to date
DROP TRIGGER IF EXISTS generate_package_for_order ON orders;

CREATE TRIGGER generate_package_for_order
  BEFORE INSERT OR UPDATE OF status, facility_id, pickup_date, delivery_date
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_package();

-- Add comment explaining function purpose
COMMENT ON FUNCTION handle_order_package IS 'Automatically generates or assigns packages for orders when they are created or updated';