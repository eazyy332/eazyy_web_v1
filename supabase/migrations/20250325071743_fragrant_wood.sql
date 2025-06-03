-- Create driver_packages table if it doesn't exist
CREATE TABLE IF NOT EXISTS driver_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES driver_shifts(id),
  driver_id uuid REFERENCES drivers(id),
  facility_id uuid REFERENCES facilities(id),
  package_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  total_orders integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  route_overview jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT driver_packages_status_check CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled'))
);

-- Create package_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS package_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES driver_packages(id) ON DELETE CASCADE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sequence_number integer NOT NULL,
  estimated_arrival time,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure each order can only be assigned to one package
  CONSTRAINT unique_order_assignment UNIQUE (order_id),
  -- Ensure unique order within a package
  CONSTRAINT package_orders_package_id_order_id_key UNIQUE (package_id, order_id),
  CONSTRAINT package_orders_status_check CHECK (status IN ('pending', 'picked_up', 'delivered', 'failed'))
);

-- Enable RLS
ALTER TABLE driver_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing indexes if they exist
DROP INDEX IF EXISTS idx_driver_packages_driver;
DROP INDEX IF EXISTS idx_driver_packages_date;
DROP INDEX IF EXISTS idx_driver_packages_status;
DROP INDEX IF EXISTS idx_package_orders_status;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_driver_packages_driver_id ON driver_packages(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_packages_package_date ON driver_packages(package_date);
CREATE INDEX IF NOT EXISTS idx_driver_packages_status ON driver_packages(status);
CREATE INDEX IF NOT EXISTS idx_package_orders_status ON package_orders(status);

-- Add comments
COMMENT ON TABLE driver_packages IS 'Stores driver delivery/pickup packages';
COMMENT ON TABLE package_orders IS 'Maps orders to driver packages';
COMMENT ON CONSTRAINT unique_order_assignment ON package_orders IS 'Ensures each order can only be assigned to one package';

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_packages' 
    AND policyname = 'Drivers can view their assigned packages'
  ) THEN
    DROP POLICY "Drivers can view their assigned packages" ON driver_packages;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'driver_packages' 
    AND policyname = 'Service role can manage all packages'
  ) THEN
    DROP POLICY "Service role can manage all packages" ON driver_packages;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'package_orders' 
    AND policyname = 'Drivers can view their package orders'
  ) THEN
    DROP POLICY "Drivers can view their package orders" ON package_orders;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'package_orders' 
    AND policyname = 'Service role can manage all package orders'
  ) THEN
    DROP POLICY "Service role can manage all package orders" ON package_orders;
  END IF;
END $$;

-- Create policies for driver_packages
CREATE POLICY "Drivers can view their assigned packages"
  ON driver_packages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM drivers 
    WHERE drivers.id = driver_packages.driver_id 
    AND drivers.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage all packages"
  ON driver_packages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create policies for package_orders
CREATE POLICY "Drivers can view their package orders"
  ON package_orders
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM driver_packages dp
    JOIN drivers d ON dp.driver_id = d.id
    WHERE dp.id = package_orders.package_id
    AND d.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage all package orders"
  ON package_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS validate_order_assignment() CASCADE;
DROP FUNCTION IF EXISTS notify_unassigned_packages() CASCADE;

-- Create function to validate order assignment
CREATE FUNCTION validate_order_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if order is already assigned to another package
  IF EXISTS (
    SELECT 1 FROM package_orders
    WHERE order_id = NEW.order_id
    AND id != NEW.id
  ) THEN
    RAISE EXCEPTION 'Order is already assigned to another package';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order assignment validation
CREATE TRIGGER enforce_order_assignment
  BEFORE INSERT OR UPDATE ON package_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_assignment();

-- Create function to notify about unassigned packages
CREATE FUNCTION notify_unassigned_packages()
RETURNS TRIGGER AS $$
BEGIN
  -- This would be replaced with actual notification logic
  -- For now, it just returns the trigger
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for unassigned package notification
CREATE TRIGGER notify_unassigned_packages_trigger
  AFTER INSERT ON driver_packages
  FOR EACH ROW
  WHEN (NEW.driver_id IS NULL)
  EXECUTE FUNCTION notify_unassigned_packages();