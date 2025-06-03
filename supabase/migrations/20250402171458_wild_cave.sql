-- Create order_issues table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  description text NOT NULL,
  reported_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT order_issues_issue_type_check CHECK (
    issue_type IN ('missing_item', 'damaged', 'wrong_item', 'other')
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_issues_order_id ON order_issues(order_id);
CREATE INDEX IF NOT EXISTS idx_order_issues_created_at ON order_issues(created_at DESC);

-- Enable RLS
ALTER TABLE order_issues ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_issues' AND policyname = 'Users can create issues'
  ) THEN
    DROP POLICY "Users can create issues" ON order_issues;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_issues' AND policyname = 'Users can read issues'
  ) THEN
    DROP POLICY "Users can read issues" ON order_issues;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_issues' AND policyname = 'Service role can do everything with issues'
  ) THEN
    DROP POLICY "Service role can do everything with issues" ON order_issues;
  END IF;
END $$;

-- Create policies with unique names to avoid conflicts
CREATE POLICY "Users can create issues 20250402"
  ON order_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can read issues 20250402"
  ON order_issues
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can do everything with issues 20250402"
  ON order_issues
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);