import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import Stripe from "npm:stripe@14.18.0";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

// Get the webhook signing secret from environment variables
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

serve(async (req) => {
  try {
    if (req.method === "POST") {
      const body = await req.text();
      const signature = req.headers.get("stripe-signature");

      if (!signature) {
        return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify the webhook signature
      let event;
      try {
        event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
      } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Handle the event
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        
        // Extract metadata
        const orderNumber = session.metadata?.order_number;
        const userId = session.metadata?.user_id;
        
        if (!orderNumber) {
          console.error("No order number in session metadata");
          return new Response(JSON.stringify({ error: "No order number in session metadata" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Update the order in the database
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            payment_method: "credit_card",
            transaction_id: session.payment_intent,
            status: "awaiting_pickup_customer"
          })
          .eq("order_number", orderNumber);

        if (updateError) {
          console.error("Error updating order:", updateError);
          return new Response(JSON.stringify({ error: "Error updating order" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        console.log(`Order ${orderNumber} marked as paid`);
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});