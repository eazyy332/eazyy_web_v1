-- Create scans table if it doesn't exist
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  scan_type text NOT NULL,
  scanned_by uuid REFERENCES auth.users(id),
  driver_id uuid REFERENCES drivers(id),
  scan_location point,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT scans_scan_type_check CHECK (
    scan_type IN ('inbound', 'outbound', 'handoff')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scans_order_id ON scans(order_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

-- Enable RLS
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scans' AND policyname = 'Users can create scans'
  ) THEN
    DROP POLICY "Users can create scans" ON scans;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scans' AND policyname = 'Users can read scans they created'
  ) THEN
    DROP POLICY "Users can read scans they created" ON scans;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'scans' AND policyname = 'Service role can do everything with scans'
  ) THEN
    DROP POLICY "Service role can do everything with scans" ON scans;
  END IF;
END $$;

-- Create policies with unique names to avoid conflicts
CREATE POLICY "Users can create scans 20250402"
  ON scans
  FOR INSERT
  TO authenticated
  WITH CHECK (scanned_by = auth.uid());

CREATE POLICY "Users can read scans they created 20250402"
  ON scans
  FOR SELECT
  TO authenticated
  USING (scanned_by = auth.uid());

CREATE POLICY "Service role can do everything with scans 20250402"
  ON scans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);