/*
  # Add Item Discrepancy Support

  1. Changes
    - Add facility_updated_items column to store updated item list
    - Add facility_notes for discrepancy explanation
    - Add item_discrepancy_photo_url for visual proof
    - Add customer_item_decision to track approval status
  
  2. Security
    - Maintain existing RLS policies
*/

-- Add new columns to orders table
DO $$ 
BEGIN
  -- Add facility_updated_items if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'facility_updated_items'
  ) THEN
    ALTER TABLE orders ADD COLUMN facility_updated_items jsonb;
  END IF;

  -- Add facility_notes if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'facility_notes'
  ) THEN
    ALTER TABLE orders ADD COLUMN facility_notes text;
  END IF;

  -- Add item_discrepancy_photo_url if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'item_discrepancy_photo_url'
  ) THEN
    ALTER TABLE orders ADD COLUMN item_discrepancy_photo_url text;
  END IF;

  -- Add customer_item_decision if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'customer_item_decision'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_item_decision text;
  END IF;
END $$;

-- Add constraint for customer_item_decision
ALTER TABLE orders DROP CONSTRAINT IF EXISTS valid_customer_item_decision;
ALTER TABLE orders ADD CONSTRAINT valid_customer_item_decision 
  CHECK (customer_item_decision IS NULL OR customer_item_decision IN ('accepted', 'declined'));

-- Update status transition function to handle item discrepancy
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
      IF NEW.status IN ('awaiting_pickup_customer', 'ready_for_delivery') THEN
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
      -- Check if item discrepancy needs customer approval
      IF NEW.status = 'pending_item_confirmation' AND 
         NEW.facility_updated_items IS NOT NULL THEN
        RETURN NEW;
      END IF;
      IF NEW.status = 'ready_for_delivery' THEN
        -- Only allow if no discrepancy or customer accepted
        IF NEW.facility_updated_items IS NULL OR 
           NEW.customer_item_decision = 'accepted' THEN
          RETURN NEW;
        END IF;
      END IF;
    WHEN 'pending_item_confirmation' THEN
      IF NEW.status = 'ready_for_delivery' AND 
         NEW.customer_item_decision = 'accepted' THEN
        RETURN NEW;
      END IF;
      IF NEW.status = 'arrived_at_facility' AND 
         NEW.customer_item_decision = 'declined' THEN
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

-- Add comments
COMMENT ON COLUMN orders.facility_updated_items IS 'Updated item list from facility inspection';
COMMENT ON COLUMN orders.facility_notes IS 'Facility notes about item discrepancies';
COMMENT ON COLUMN orders.item_discrepancy_photo_url IS 'Photo evidence of item discrepancies';
COMMENT ON COLUMN orders.customer_item_decision IS 'Customer decision on updated items (accepted/declined)';