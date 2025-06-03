-- Create order_status_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  logged_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  photos text[] DEFAULT '{}'::text[]
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order_id ON order_status_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_created_at ON order_status_logs(created_at DESC);

-- Enable RLS
ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_status_logs' AND policyname = 'Users can create status logs'
  ) THEN
    DROP POLICY "Users can create status logs" ON order_status_logs;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_status_logs' AND policyname = 'Users can read status logs'
  ) THEN
    DROP POLICY "Users can read status logs" ON order_status_logs;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_status_logs' AND policyname = 'Users can read own status logs'
  ) THEN
    DROP POLICY "Users can read own status logs" ON order_status_logs;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_status_logs' AND policyname = 'Service role can do everything with status logs'
  ) THEN
    DROP POLICY "Service role can do everything with status logs" ON order_status_logs;
  END IF;
END $$;

-- Create policies with unique names to avoid conflicts
CREATE POLICY "Users can create status logs 20250402"
  ON order_status_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = logged_by);

CREATE POLICY "Users can read status logs 20250402"
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