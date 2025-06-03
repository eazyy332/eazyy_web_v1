import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import Stripe from "npm:stripe@14.18.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe with the secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the request body
    const { items, userId, customerInfo, successUrl, cancelUrl } = await req.json();

    if (!items || !items.length || !successUrl || !cancelUrl) {
      return new Response(JSON.stringify({ error: "Missing required parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the actual items from the database to verify prices
    const itemIds = items.map((item: any) => item.id);
    const { data: dbItems, error: dbError } = await supabase
      .from("items")
      .select("id, name, description, price, custom_pricing, unit_price")
      .in("id", itemIds);

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to fetch items" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a map of items for easy lookup
    const dbItemsMap = new Map();
    dbItems.forEach((item) => {
      dbItemsMap.set(item.id, item);
    });

    // Create line items for Stripe
    const lineItems = items.map((item: any) => {
      const dbItem = dbItemsMap.get(item.id);
      
      if (!dbItem) {
        throw new Error(`Item with ID ${item.id} not found in database`);
      }

      let unitAmount;
      let name = dbItem.name;
      let description = `${item.quantity}x item`;

      // Handle custom pricing items
      if (dbItem.custom_pricing && item.custom_input_value && dbItem.unit_price) {
        unitAmount = Math.round(dbItem.unit_price * 100); // Convert to cents
        name = `${dbItem.name} (${item.custom_input_value} ${item.unit_label || 'units'})`;
        description = `Custom priced item`;
      } else {
        // Regular items
        unitAmount = Math.round(dbItem.price * 100); // Convert to cents
      }

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name,
            description,
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });
    
    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        order_number: customerInfo?.orderNumber || "",
        user_id: userId || "guest",
      },
      customer_email: customerInfo?.email,
      payment_method_options: {
        card: {
          setup_future_usage: 'off_session'
        }
      },
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['NL', 'BE', 'DE']
      },
      locale: 'auto'
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    
    return new Response(JSON.stringify({ error: error.message || "Failed to create checkout session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});