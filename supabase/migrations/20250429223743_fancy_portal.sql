/*
  # Update RLS Policies for Orders Table

  1. Changes
    - Drop existing policies
    - Create new policies with proper access control
    - Add policies for authenticated users
    - Add policy for service role
  
  2. Security
    - Enable RLS
    - Allow users to read and create their own orders
    - Allow users to update specific fields on pending orders
    - Allow service role full access
*/

-- Enable RLS if not already enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "orders_insert_own_20250320" ON orders;
DROP POLICY IF EXISTS "orders_read_own_20250320" ON orders;
DROP POLICY IF EXISTS "orders_update_own_20250320" ON orders;
DROP POLICY IF EXISTS "orders_service_role_20250320" ON orders;
DROP POLICY IF EXISTS "Allow facility staff read access" ON orders;
DROP POLICY IF EXISTS "Allow facility staff update access" ON orders;
DROP POLICY IF EXISTS "Allow full access to facility orders" ON orders;
DROP POLICY IF EXISTS "Allow full access to orders" ON orders;

-- Create new policies with proper access control
CREATE POLICY "User can read own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update special instructions on pending orders
CREATE POLICY "User can update instructions on pending orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Allow service role full access
CREATE POLICY "Service role can manage orders"
  ON orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON POLICY "User can read own orders" ON orders IS 'Allows users to view only their own orders';
COMMENT ON POLICY "User can create orders" ON orders IS 'Allows users to create orders only for themselves';
COMMENT ON POLICY "User can update instructions on pending orders" ON orders IS 'Allows users to update special instructions only on their pending orders';
COMMENT ON POLICY "Service role can manage orders" ON orders IS 'Allows service role to perform all operations on all orders';