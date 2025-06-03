-- Drop existing constraints and triggers
DROP TRIGGER IF EXISTS generate_package_for_order ON orders;
DROP TRIGGER IF EXISTS enforce_status_transition ON orders;
DROP FUNCTION IF EXISTS handle_order_package CASCADE;
DROP FUNCTION IF EXISTS validate_status_transition CASCADE;

-- Update order status constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_order_status;
ALTER TABLE orders ADD CONSTRAINT valid_order_status 
CHECK (status IN (
  'pending',
  'awaiting_pickup_customer',
  'in_transit_to_facility',
  'arrived_at_facility',
  'pending_item_confirmation',
  'processing',
  'ready_for_delivery',
  'in_transit_to_customer',
  'delivered',
  'cancelled'
));

-- Create function to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow same status
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow transition to cancelled from any state
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Define valid transitions
  CASE OLD.status
    WHEN 'pending' THEN
      IF NEW.status = 'awaiting_pickup_customer' THEN
        RETURN NEW;
      END IF;
    WHEN 'awaiting_pickup_customer' THEN
      IF NEW.status = 'in_transit_to_facility' THEN
        RETURN NEW;
      END IF;
    WHEN 'in_transit_to_facility' THEN
      IF NEW.status = 'arrived_at_facility' THEN
        RETURN NEW;
      END IF;
    WHEN 'arrived_at_facility' THEN
      IF NEW.status IN ('pending_item_confirmation', 'processing') THEN
        RETURN NEW;
      END IF;
    WHEN 'pending_item_confirmation' THEN
      IF NEW.status = 'processing' AND NEW.customer_item_decision = 'accepted' THEN
        RETURN NEW;
      END IF;
      IF NEW.status = 'arrived_at_facility' AND NEW.customer_item_decision = 'declined' THEN
        RETURN NEW;
      END IF;
    WHEN 'processing' THEN
      IF NEW.status = 'ready_for_delivery' THEN
        RETURN NEW;
      END IF;
    WHEN 'ready_for_delivery' THEN
      IF NEW.status = 'in_transit_to_customer' THEN
        RETURN NEW;
      END IF;
    WHEN 'in_transit_to_customer' THEN
      IF NEW.status = 'delivered' THEN
        RETURN NEW;
      END IF;
  END CASE;

  RAISE EXCEPTION 'Invalid status transition from % to %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

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
  -- For updates, check if relevant fields changed
  IF TG_OP = 'UPDATE' THEN
    fields_changed := (
      NEW.status != OLD.status OR
      NEW.facility_id IS DISTINCT FROM OLD.facility_id OR
      NEW.pickup_date != OLD.pickup_date OR
      NEW.delivery_date IS DISTINCT FROM OLD.delivery_date
    );
    
    IF NOT fields_changed THEN
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
    RETURN NEW;
  END IF;

  -- Only create package for processing orders with a facility
  IF NEW.status = 'processing' AND NEW.facility_id IS NOT NULL THEN
    delivery_time := COALESCE(NEW.delivery_date, NEW.pickup_date);

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
        NULL; -- Ignore duplicate insertions
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_order_package: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER enforce_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();

CREATE TRIGGER generate_package_for_order
  AFTER INSERT OR UPDATE OF status, facility_id, pickup_date, delivery_date
  ON orders
  FOR EACH ROW
  WHEN (NEW.status = 'processing' AND NEW.facility_id IS NOT NULL)
  EXECUTE FUNCTION handle_order_package();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_package_orders_order_lookup 
ON package_orders (order_id, package_id);

CREATE INDEX IF NOT EXISTS idx_driver_packages_time_lookup 
ON driver_packages (facility_id, package_date, start_time, end_time) 
WHERE status IN ('pending', 'assigned');

-- Add comments
COMMENT ON FUNCTION handle_order_package IS 'Automatically generates or assigns packages for orders when they are created or updated. Includes duplicate prevention and concurrency handling.';
COMMENT ON FUNCTION validate_status_transition IS 'Validates order status transitions to ensure they follow the correct workflow';