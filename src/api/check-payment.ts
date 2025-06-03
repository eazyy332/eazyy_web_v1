import Stripe from 'stripe';

const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

export async function checkPayment(paymentIntentId: string) {
  try {
    const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment`);
    url.searchParams.append('payment_intent', paymentIntentId);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
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