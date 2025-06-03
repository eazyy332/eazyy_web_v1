/*
  # Fix RLS Policies for Order Status Logs

  1. Changes
    - Create new RLS policies for order_status_logs table
    - Add proper permissions for users and service role
    - Ensure users can create logs and read their own logs
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add policy for service role
*/

-- Enable RLS
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create status logs 20250402" ON order_status_logs;
DROP POLICY IF EXISTS "Users can read status logs 20250402" ON order_status_logs;
DROP POLICY IF EXISTS "Service role can do everything with status logs 20250402" ON order_status_logs;

-- Create policies with unique names
CREATE POLICY "Users can insert status logs 20250402"
  ON order_status_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (logged_by = auth.uid());

CREATE POLICY "Users can read own status logs 20250402"
  ON order_status_logs
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_status_logs.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Service role can do everything with status logs 20250402"
  ON order_status_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);