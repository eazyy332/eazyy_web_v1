import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Eazyy Laundry Service',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'GET') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const url = new URL(req.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return corsResponse({ error: 'Session ID is required' }, 400);
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent'],
    });

    // Get order details from metadata
    const orderNumber = session.metadata?.order_number || `ORDER-${Date.now()}`;
    
    // Check if the order exists in the database
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status')
      .eq('order_number', orderNumber)
      .single();
    
    if (orderError) {
      console.error(`Error fetching order: ${orderError.message}`);
    }
    
    // If payment was successful and order exists, update the order status
    if (session.payment_status === 'paid' && orderData && orderData.payment_status !== 'paid') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: 'credit_card',
          transaction_id: session.payment_intent as string,
          status: 'awaiting_pickup_customer'
        })
        .eq('order_number', orderNumber);
      
      if (updateError) {
        console.error(`Error updating order: ${updateError.message}`);
      } else {
        console.log(`Order ${orderNumber} marked as paid`);
      }
    }

    return corsResponse({
      ...session,
      orderNumber,
    });
  } catch (error: any) {
    console.error(`Session retrieval error: ${error.message}`);
    return corsResponse({ error: error.message }, 500);
  }
});