import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, ArrowLeft, Check, Info, DollarSign } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { createCheckoutSession } from '../../api/stripe-service';

interface PaymentPageProps {
  orderId: string;
  orderNumber: string;
  amountDue: number;
  originalTotal: number;
  newTotal: number;
}

const Payment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // Get payment details from location state
  const paymentDetails = location.state as PaymentPageProps;

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!paymentDetails || !paymentDetails.orderId) {
      navigate('/account/orders');
      return;
    }
  }, [user, paymentDetails, navigate]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create a checkout session with Stripe
      const cartItems = [{
        id: paymentDetails.orderId,
        name: `Additional payment for Order #${paymentDetails.orderNumber}`,
        price: paymentDetails.amountDue,
        quantity: 1
      }];

      const customerInfo = {
        name: `${user?.user_metadata.first_name || ''} ${user?.user_metadata.last_name || ''}`.trim(),
        email: user?.email,
        orderNumber: paymentDetails.orderNumber
      };

      // Redirect to Stripe checkout
      const checkoutUrl = await createCheckoutSession(cartItems, customerInfo);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Failed to process payment');
      setLoading(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Payment Successful!
            </h2>
            <p className="text-gray-600">
              Your payment has been processed and your order is now being processed.
            </p>
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
              Additional Payment Required
            </h1>
          </div>
          <p className="text-gray-600">
            Order #{paymentDetails?.orderNumber}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-800 mb-1">Payment Information</h3>
              <p className="text-blue-700 text-sm">
                Your order has additional items that require payment before processing can begin.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Original Total</span>
              <span className="text-gray-700">€{paymentDetails?.originalTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New Total</span>
              <span className="text-gray-700">€{paymentDetails?.newTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">VAT (21%)</span>
              <span className="text-gray-700">€{(paymentDetails?.amountDue * 0.21).toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="flex justify-between items-center font-medium">
                <span className="text-gray-800">Amount Due</span>
                <span className="text-xl text-gray-900">€{(paymentDetails?.amountDue * 1.21).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Payment Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <motion.button
            onClick={() => navigate(-1)}
            disabled={loading}
            className="flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </motion.button>

          <motion.button
            onClick={handlePayment}
            disabled={loading}
            className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </div>
            ) : (
              <>
                <DollarSign className="w-5 h-5 mr-2" />
                Pay €{(paymentDetails?.amountDue * 1.21).toFixed(2)}
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Payment;