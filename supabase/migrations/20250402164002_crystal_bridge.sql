-- Create order_status_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_changed_at ON order_status_history(changed_at DESC);

-- Enable RLS
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_status_history' AND policyname = 'Users can read status history'
  ) THEN
    DROP POLICY "Users can read status history" ON order_status_history;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_status_history' AND policyname = 'Service role can do everything'
  ) THEN
    DROP POLICY "Service role can do everything" ON order_status_history;
  END IF;
END $$;

-- Create policies
CREATE POLICY "Users can read status history"
  ON order_status_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can do everything"
  ON order_status_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to track order status changes
CREATE OR REPLACE FUNCTION track_order_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Use SECURITY DEFINER to bypass RLS
    INSERT INTO order_status_history (
      order_id,
      previous_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
      CASE
        WHEN NEW.status = 'pending_item_confirmation' THEN 'Item discrepancy detected'
        WHEN NEW.status = 'processing' AND OLD.status = 'pending_item_confirmation' THEN 'Customer accepted updated items'
        WHEN NEW.status = 'arrived_at_facility' AND OLD.status = 'pending_item_confirmation' THEN 'Customer declined updated items'
        ELSE NULL
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for status history
DROP TRIGGER IF EXISTS track_order_status_changes ON orders;
CREATE TRIGGER track_order_status_changes
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION track_order_status_changes();