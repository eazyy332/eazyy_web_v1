import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function syncStripeProducts() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('You must be logged in to sync products');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync products');
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing products:', error);
    throw error;
  }
}

export async function getStripeProducts() {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-sync`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get products');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

export async function createCheckoutSession(cartItems: any[], customerInfo: any) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('You must be logged in to checkout');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        items: cartItems,
        userId: session.user.id,
        customerInfo,
        successUrl: `${window.location.origin}/checkout/success`,
        cancelUrl: `${window.location.origin}/checkout/canceled`
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Checkout error:', error);
    throw error;
  }
}

export async function getOrderBySessionId(sessionId: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout/session?session_id=${sessionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get order');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting order:', error);
    throw error;
  }
}

export async function createPaymentIntent(orderData: {
  amount: number;
  currency: string;
  description: string;
  metadata: {
    orderNumber: string;
    customerName: string;
    email: string;
  };
}) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
}

export async function checkPayment(paymentIntentId: string) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/check-payment?payment_intent=${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check payment status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
}