/*
  # Create Package Logs Table and Indexes

  1. Changes
    - Create package_logs table for audit logging
    - Add proper indexes for performance
    - Add RLS policies for security
  
  2. Security
    - Enable RLS
    - Add policies for admin access
    - Add policy for service role
*/

-- Create index for time-based lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_package_orders_order_lookup 
ON package_orders (order_id, package_id);

-- Create index for time-based package lookups
CREATE INDEX IF NOT EXISTS idx_driver_packages_time_lookup 
ON driver_packages (facility_id, package_date, start_time, end_time) 
WHERE status IN ('pending', 'assigned');

-- Update package_logs table if it exists
CREATE TABLE IF NOT EXISTS package_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES driver_packages(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for package logs
CREATE INDEX IF NOT EXISTS idx_package_logs_event ON package_logs(event_type);

-- Enable RLS
ALTER TABLE package_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'package_logs' AND policyname = 'Admin users can view all logs'
  ) THEN
    DROP POLICY "Admin users can view all logs" ON package_logs;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'package_logs' AND policyname = 'Service role can manage all logs'
  ) THEN
    DROP POLICY "Service role can manage all logs" ON package_logs;
  END IF;
END $$;

-- Create policies
CREATE POLICY "Admin users can view all logs"
  ON package_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM admin_users
    WHERE admin_users.auth_id = auth.uid()
  ));

CREATE POLICY "Service role can manage all logs"
  ON package_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON TABLE package_logs IS 'Audit log for package-related events';