import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, ArrowLeft, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { createPaymentIntent } from '../../api/create-payment';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import StripePaymentForm from '../../components/stripe/StripePaymentForm';

// Initialize Stripe with the publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentPageProps {
  orderNumber: string;
  totalAmount: number;
}

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // Get payment details from location state
  const paymentDetails = location.state as PaymentPageProps;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!paymentDetails || !paymentDetails.orderNumber) {
      navigate('/account/orders');
      return;
    }

    const fetchPaymentIntent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Create a payment intent with Stripe
        const paymentData = {
          amount: paymentDetails.totalAmount,
          currency: 'eur',
          description: `Order #${paymentDetails.orderNumber}`,
          metadata: {
            orderNumber: paymentDetails.orderNumber,
            customerName: `${user?.user_metadata.first_name || ''} ${user?.user_metadata.last_name || ''}`.trim(),
            email: user?.email || ''
          }
        };

        const { clientSecret } = await createPaymentIntent(paymentData);
        setClientSecret(clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setError(error instanceof Error ? error.message : 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentIntent();
  }, [user, paymentDetails, navigate]);

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    // Navigate to success page is handled in the StripePaymentForm component
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment error:', error);
    setError(error.message);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing payment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <motion.button
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900"
              whileHover={{ x: -5 }}
            >
              <ArrowLeft className="w-6 h-6" />
            </motion.button>
            <h1 className="text-2xl font-bold text-gray-900">
              Complete Your Payment
            </h1>
          </div>
          <p className="text-gray-600">
            Order #{paymentDetails?.orderNumber}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Order Number</span>
              <span className="text-gray-700 font-medium">{paymentDetails?.orderNumber}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-800">Total Amount</span>
                <span className="text-xl text-gray-900">€{paymentDetails?.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
            Payment Details
          </h3>

          {clientSecret ? (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#2563eb',
                  },
                }
              }}
            >
              <StripePaymentForm 
                clientSecret={clientSecret}
                amount={paymentDetails.totalAmount}
                orderNumber={paymentDetails.orderNumber}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </Elements>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800 mb-1">Payment Error</h3>
                  <p className="text-red-700 text-sm">{error || 'Unable to initialize payment. Please try again.'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">Secure Payment</h3>
          <p className="text-blue-700 text-sm">
            Your payment information is securely processed by Stripe. We never store your full card details on our servers.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Payment;