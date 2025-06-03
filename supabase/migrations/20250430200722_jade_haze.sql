/*
  # Create Original Orders Table and Trigger

  1. New Table
    - `original_orders`: Stores a copy of the original order data
      - Has the same schema as the `orders` table
      - Created when a new order is placed
  
  2. Trigger
    - Automatically copies order data to original_orders on insert
    - Preserves the original state of the order
  
  3. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add policy for service role
*/

-- Create the original_orders table
CREATE TABLE IF NOT EXISTS original_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number varchar(20) UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  customer_name text NOT NULL,
  email text NOT NULL,
  phone text,
  shipping_address text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  payment_status text DEFAULT 'pending',
  transaction_id text,
  shipping_method text NOT NULL,
  special_instructions text,
  subtotal numeric(10,2) NOT NULL,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  shipping_fee numeric(10,2) NOT NULL DEFAULT 0,
  total_amount numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  qr_code text,
  assigned_driver_id uuid REFERENCES drivers(id),
  last_status_update timestamptz DEFAULT now(),
  type text DEFAULT 'delivery',
  facility_id uuid REFERENCES facilities(id),
  latitude text,
  longitude text,
  is_pickup_completed boolean DEFAULT false,
  is_facility_processing boolean DEFAULT false,
  is_dropoff_completed boolean DEFAULT false,
  pickup_date timestamptz NOT NULL,
  delivery_date timestamptz,
  order_type text DEFAULT 'standard',
  quote_status text DEFAULT 'none',
  facility_updated_items jsonb,
  facility_notes text,
  item_discrepancy_photo_url text,
  customer_item_decision text,
  admin_comment text,
  assigned_pickup_driver_id uuid REFERENCES drivers(id),
  assigned_dropoff_driver_id uuid REFERENCES drivers(id),
  estimated_pickup_time text,
  estimated_dropoff_time text,
  discrepancy_status text,
  is_discrepancy_order boolean DEFAULT false,
  original_order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  discrepancy_number integer,
  discrepancy_resolution_notes text,
  discrepancy_resolved_at timestamp with time zone,
  discrepancy_resolved_by uuid REFERENCES auth.users(id),
  service_id uuid REFERENCES services(id),
  service_name text,
  category_id uuid REFERENCES categories(id),
  category_name text,
  internal_notes text,
  customer_id uuid REFERENCES customers(id),
  has_discrepancy boolean DEFAULT false,
  delivery_by timestamp with time zone,
  CONSTRAINT valid_order_status CHECK (status IN (
    'pending',
    'awaiting_pickup_customer',
    'in_transit_to_facility',
    'arrived_at_facility',
    'pending_item_confirmation',
    'processing',
    'ready_for_delivery',
    'in_transit_to_customer',
    'delivered',
    'cancelled'
  )),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('credit_card', 'ideal', 'bancontact', 'cash')),
  CONSTRAINT valid_pickup_state CHECK (
    (NOT is_facility_processing OR is_pickup_completed) AND
    (NOT is_dropoff_completed OR is_pickup_completed)
  ),
  CONSTRAINT valid_processing_state CHECK (
    NOT is_dropoff_completed OR NOT is_facility_processing
  ),
  CONSTRAINT valid_order_type CHECK (type IN ('pickup', 'delivery')),
  CONSTRAINT valid_customer_item_decision CHECK (
    customer_item_decision IS NULL OR customer_item_decision IN ('accepted', 'declined')
  ),
  CONSTRAINT valid_delivery_date CHECK (
    delivery_date IS NULL OR delivery_date > pickup_date
  ),
  CONSTRAINT valid_discrepancy_order CHECK (
    (is_discrepancy_order = false AND original_order_id IS NULL) OR 
    (is_discrepancy_order = true AND original_order_id IS NOT NULL)
  ),
  CONSTRAINT valid_discrepancy_status CHECK (
    discrepancy_status IS NULL OR discrepancy_status IN (
      'reported_by_facility', 
      'awaiting_admin_review', 
      'awaiting_customer_reply', 
      'resolved_by_customer', 
      'resolved_by_admin'
    )
  ),
  CONSTRAINT valid_latitude CHECK (
    CAST(latitude AS numeric) >= -90 AND CAST(latitude AS numeric) <= 90
  ),
  CONSTRAINT valid_longitude CHECK (
    CAST(longitude AS numeric) >= -180 AND CAST(longitude AS numeric) <= 180
  )
);

-- Create function to copy order data to original_orders
CREATE OR REPLACE FUNCTION copy_order_to_original()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO original_orders (
    id,
    order_number,
    user_id,
    customer_name,
    email,
    phone,
    shipping_address,
    status,
    payment_method,
    payment_status,
    transaction_id,
    shipping_method,
    special_instructions,
    subtotal,
    tax,
    shipping_fee,
    total_amount,
    created_at,
    updated_at,
    qr_code,
    assigned_driver_id,
    last_status_update,
    type,
    facility_id,
    latitude,
    longitude,
    is_pickup_completed,
    is_facility_processing,
    is_dropoff_completed,
    pickup_date,
    delivery_date,
    order_type,
    quote_status,
    facility_updated_items,
    facility_notes,
    item_discrepancy_photo_url,
    customer_item_decision,
    admin_comment,
    assigned_pickup_driver_id,
    assigned_dropoff_driver_id,
    estimated_pickup_time,
    estimated_dropoff_time,
    discrepancy_status,
    is_discrepancy_order,
    original_order_id,
    discrepancy_number,
    discrepancy_resolution_notes,
    discrepancy_resolved_at,
    discrepancy_resolved_by,
    service_id,
    service_name,
    category_id,
    category_name,
    internal_notes,
    customer_id,
    has_discrepancy,
    delivery_by
  ) VALUES (
    NEW.id,
    NEW.order_number,
    NEW.user_id,
    NEW.customer_name,
    NEW.email,
    NEW.phone,
    NEW.shipping_address,
    NEW.status,
    NEW.payment_method,
    NEW.payment_status,
    NEW.transaction_id,
    NEW.shipping_method,
    NEW.special_instructions,
    NEW.subtotal,
    NEW.tax,
    NEW.shipping_fee,
    NEW.total_amount,
    NEW.created_at,
    NEW.updated_at,
    NEW.qr_code,
    NEW.assigned_driver_id,
    NEW.last_status_update,
    NEW.type,
    NEW.facility_id,
    NEW.latitude,
    NEW.longitude,
    NEW.is_pickup_completed,
    NEW.is_facility_processing,
    NEW.is_dropoff_completed,
    NEW.pickup_date,
    NEW.delivery_date,
    NEW.order_type,
    NEW.quote_status,
    NEW.facility_updated_items,
    NEW.facility_notes,
    NEW.item_discrepancy_photo_url,
    NEW.customer_item_decision,
    NEW.admin_comment,
    NEW.assigned_pickup_driver_id,
    NEW.assigned_dropoff_driver_id,
    NEW.estimated_pickup_time,
    NEW.estimated_dropoff_time,
    NEW.discrepancy_status,
    NEW.is_discrepancy_order,
    NEW.original_order_id,
    NEW.discrepancy_number,
    NEW.discrepancy_resolution_notes,
    NEW.discrepancy_resolved_at,
    NEW.discrepancy_resolved_by,
    NEW.service_id,
    NEW.service_name,
    NEW.category_id,
    NEW.category_name,
    NEW.internal_notes,
    NEW.customer_id,
    NEW.has_discrepancy,
    NEW.delivery_by
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error copying order to original_orders: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to copy order data
CREATE TRIGGER on_orders_insert
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION copy_order_to_original();

-- Enable RLS on original_orders table
ALTER TABLE original_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for original_orders
CREATE POLICY "Enable read access for own original orders"
  ON original_orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage original orders"
  ON original_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_original_orders_user_id ON original_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_original_orders_order_number ON original_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_original_orders_created_at ON original_orders(created_at DESC);

-- Add comment explaining the table's purpose
COMMENT ON TABLE original_orders IS 'Stores a copy of the original order data when a customer places an order';