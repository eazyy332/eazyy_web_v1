/*
  # Fix Order Status Transition Validation

  1. Changes
    - Update validate_status_transition function to allow transition from pending_item_confirmation to arrived_at_facility
    - This allows customers to decline item discrepancies and return the order to the facility
  
  2. Security
    - Maintain existing RLS policies
*/

-- Update status transition function to allow pending_item_confirmation to arrived_at_facility transition
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
      IF NEW.status = 'processing' THEN
        RETURN NEW;
      END IF;
    WHEN 'pending_item_confirmation' THEN
      -- Allow transition to processing if customer accepts
      IF NEW.status = 'processing' AND 
         NEW.customer_item_decision = 'accepted' THEN
        RETURN NEW;
      END IF;
      -- Allow transition back to arrived_at_facility if customer declines
      IF NEW.status = 'arrived_at_facility' AND 
         NEW.customer_item_decision = 'declined' THEN
        RETURN NEW;
      END IF;
    WHEN 'processing' THEN
      IF NEW.status = 'ready_for_delivery' THEN
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

-- Add comment explaining the function
COMMENT ON FUNCTION validate_status_transition IS 'Validates order status transitions and allows admin overrides';