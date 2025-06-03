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
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { amount, currency, description, metadata } = body;

    // Validate required fields
    if (!amount || !currency || !description) {
      throw new Error('Missing required payment fields');
    }

    console.log('Creating payment with data:', {
      amount,
      currency,
      description,
      metadata
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description,
      metadata: {
        order_number: metadata?.orderNumber || '',
        customer_name: metadata?.customerName || 'Guest',
        email: metadata?.email || ''
      },
      payment_method_types: ['card', 'ideal'],
    });

    console.log('Payment intent created:', paymentIntent);

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error('Payment creation error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Payment creation failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});