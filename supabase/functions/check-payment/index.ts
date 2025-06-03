import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.18.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Stripe with the secret key from environment variable
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const paymentIntentId = url.searchParams.get("payment_intent");

    if (!paymentIntentId) {
      throw new Error("Payment intent ID is required");
    }

    // Retrieve the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Get order details from metadata
    const orderNumber = paymentIntent.metadata.order_number;
    const totalAmount = paymentIntent.amount / 100; // Convert from cents to euros

    return new Response(
      JSON.stringify({
        status: paymentIntent.status,
        orderDetails: {
          orderNumber,
          totalAmount,
          estimatedDelivery: new Date().toISOString() // You would get this from your database
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Payment check error:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Payment check failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});