import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderRequest {
  customer_name: string;
  email: string;
  phone?: string;
  shipping_address: string;
  shipping_method: string;
  special_instructions?: string;
  pickup_date: string;
  delivery_date?: string;
  type: 'pickup' | 'delivery';
  order_type: 'standard' | 'custom_quote';
  items: OrderItem[];
  latitude: string;
  longitude: string;
  estimated_pickup_time?: string;
  estimated_dropoff_time?: string;
  service_id?: string;
  category_id?: string;
}

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  custom_input_value?: number;
  calculated_price?: number;
  unit_label?: string;
  service_id?: string;
  category_id?: string;
  service_name?: string;
  category_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the request body
    const requestData: OrderRequest = await req.json();

    // Validate required fields
    const requiredFields = [
      'customer_name', 'email', 'shipping_address', 'shipping_method', 
      'pickup_date', 'type', 'order_type', 'items', 'latitude', 'longitude'
    ];
    
    for (const field of requiredFields) {
      if (!requestData[field as keyof OrderRequest]) {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Validate items array
    if (!Array.isArray(requestData.items) || requestData.items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Order must contain at least one item" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate each item
    for (const item of requestData.items) {
      if (!item.product_id || !item.product_name || !item.quantity || !item.unit_price) {
        return new Response(
          JSON.stringify({ error: "Each item must have product_id, product_name, quantity, and unit_price" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a unique order number
    const orderNumber = `ORD${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;

    // Calculate subtotal, tax, and total
    const subtotal = requestData.items.reduce((sum, item) => {
      const itemTotal = item.calculated_price || (item.unit_price * item.quantity);
      return sum + itemTotal;
    }, 0);
    
    const tax = subtotal * 0.21; // 21% VAT
    const shippingFee = 0; // Free shipping
    const totalAmount = subtotal + tax + shippingFee;

    // Prepare order data
    const orderData = {
      order_number: orderNumber,
      user_id: user.id,
      customer_name: requestData.customer_name,
      email: requestData.email,
      phone: requestData.phone || null,
      shipping_address: requestData.shipping_address,
      shipping_method: requestData.shipping_method,
      pickup_date: requestData.pickup_date,
      delivery_date: requestData.delivery_date || null,
      special_instructions: requestData.special_instructions || null,
      subtotal,
      tax,
      shipping_fee: shippingFee,
      total_amount: totalAmount,
      status: requestData.order_type === 'custom_quote' ? 'pending' : 'awaiting_pickup_customer',
      payment_status: 'pending',
      latitude: requestData.latitude,
      longitude: requestData.longitude,
      type: requestData.type,
      is_pickup_completed: false,
      is_facility_processing: false,
      is_dropoff_completed: false,
      order_type: requestData.order_type,
      quote_status: requestData.order_type === 'custom_quote' ? 'pending' : 'none',
      estimated_pickup_time: requestData.estimated_pickup_time || null,
      estimated_dropoff_time: requestData.estimated_dropoff_time || null,
      service_id: requestData.service_id || null,
      category_id: requestData.category_id || null
    };

    // Insert order into database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select('id, order_number')
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      return new Response(
        JSON.stringify({ error: `Failed to create order: ${orderError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare order items
    const orderItems = requestData.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.calculated_price || (item.unit_price * item.quantity),
      custom_input_value: item.custom_input_value || null,
      calculated_price: item.calculated_price || null,
      unit_label: item.unit_label || null,
      service_id: item.service_id || null,
      category_id: item.category_id || null,
      service_name: item.service_name || null,
      category_name: item.category_name || null
    }));

    // Insert order items into database
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items creation error:', itemsError);
      // Attempt to delete the order if items creation fails
      await supabase.from('orders').delete().eq('id', order.id);
      
      return new Response(
        JSON.stringify({ error: `Failed to create order items: ${itemsError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          order_number: order.order_number,
          total_amount: totalAmount
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});