/*
  # Update RLS Policies for Order Items Table

  1. Changes
    - Drop existing policies
    - Create new policies with proper access control
    - Add policies for authenticated users
    - Add policy for service role
  
  2. Security
    - Enable RLS
    - Allow users to read their own order items
    - Allow users to create items for their own orders
    - Allow service role full access
*/

-- Enable RLS if not already enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "order_items_insert_own_20250320" ON order_items;
DROP POLICY IF EXISTS "order_items_read_own_20250320" ON order_items;
DROP POLICY IF EXISTS "order_items_service_role_20250320" ON order_items;
DROP POLICY IF EXISTS "Allow facility staff read access" ON order_items;
DROP POLICY IF EXISTS "Allow facility staff update access" ON order_items;
DROP POLICY IF EXISTS "Allow full access to order items" ON order_items;

-- Create new policies with proper access control
CREATE POLICY "User can read own order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "User can create order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
    AND orders.status = 'pending'
  ));

-- Allow service role full access
CREATE POLICY "Service role can manage order items"
  ON order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add comments
COMMENT ON POLICY "User can read own order items" ON order_items IS 'Allows users to view items only for their own orders';
COMMENT ON POLICY "User can create order items" ON order_items IS 'Allows users to create items only for their own pending orders';
COMMENT ON POLICY "Service role can manage order items" ON order_items IS 'Allows service role to perform all operations on all order items';