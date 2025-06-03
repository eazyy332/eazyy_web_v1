/*
  # Copy Order Items to Original Orders

  1. Changes
    - Create original_order_items table to store original order items
    - Add trigger to copy order items when an order is inserted
    - Ensure service_id, category_id, service_name, category_name are copied
  
  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add policy for service role
*/

-- Create original_order_items table with the same structure as order_items
CREATE TABLE IF NOT EXISTS original_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES original_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  calculated_price numeric(10,2),
  custom_input_value numeric(10,2),
  unit_label text,
  description text,
  photo_url text,
  service_type text,
  actual_quantity integer,
  service_id uuid REFERENCES services(id),
  category_id uuid REFERENCES categories(id),
  category_name text,
  service_name text,
  is_temporary boolean NOT NULL DEFAULT false,
  
  -- Add constraints
  CONSTRAINT valid_actual_quantity CHECK (
    actual_quantity IS NULL OR actual_quantity >= 0
  )
);

-- Create indexes for better performance
CREATE INDEX idx_original_order_items_order_id ON original_order_items(order_id);
CREATE INDEX idx_original_order_items_product_id ON original_order_items(product_id);
CREATE INDEX idx_original_order_items_service_id ON original_order_items(service_id);
CREATE INDEX idx_original_order_items_category_id ON original_order_items(category_id);

-- Enable RLS
ALTER TABLE original_order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for own original order items"
  ON original_order_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM original_orders
    WHERE original_orders.id = original_order_items.order_id
    AND original_orders.user_id = auth.uid()
  ));

CREATE POLICY "Service role can manage original order items"
  ON original_order_items
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to copy order items to original_order_items
CREATE OR REPLACE FUNCTION copy_order_items_to_original()
RETURNS TRIGGER AS $$
BEGIN
  -- Copy all order items to original_order_items
  INSERT INTO original_order_items (
    id,
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    created_at,
    updated_at,
    calculated_price,
    custom_input_value,
    unit_label,
    description,
    photo_url,
    service_type,
    actual_quantity,
    service_id,
    category_id,
    category_name,
    service_name,
    is_temporary
  )
  SELECT
    oi.id,
    NEW.id, -- Use the original_orders.id as the order_id
    oi.product_id,
    oi.product_name,
    oi.quantity,
    oi.unit_price,
    oi.subtotal,
    oi.created_at,
    oi.updated_at,
    oi.calculated_price,
    oi.custom_input_value,
    oi.unit_label,
    oi.description,
    oi.photo_url,
    oi.service_type,
    oi.actual_quantity,
    oi.service_id,
    oi.category_id,
    oi.category_name,
    oi.service_name,
    oi.is_temporary
  FROM order_items oi
  WHERE oi.order_id = NEW.id;
  
  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error copying order items to original_order_items: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to copy order items when an original order is inserted
CREATE TRIGGER on_original_orders_insert
  AFTER INSERT ON original_orders
  FOR EACH ROW
  EXECUTE FUNCTION copy_order_items_to_original();

-- Update copy_order_to_original function to also copy service and category info
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

-- Drop and recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS on_orders_insert ON orders;
CREATE TRIGGER on_orders_insert
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION copy_order_to_original();

-- Add comment explaining the table purpose
COMMENT ON TABLE original_order_items IS 'Stores a copy of the original order items when a customer places an order';