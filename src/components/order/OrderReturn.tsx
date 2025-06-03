import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader, ArrowRight } from 'lucide-react';

const OrderReturn: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'success' | 'error' | 'loading'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<{
    orderNumber: string;
    totalAmount: number;
    estimatedDelivery: string;
  } | null>(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        const paymentIntentId = searchParams.get('payment_intent');
        if (!paymentIntentId) {
          throw new Error('No payment intent ID found');
        }

        // Fetch payment status from your backend
        const response = await fetch(`/api/check-payment?payment_intent=${paymentIntentId}`);
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.status === 'succeeded') {
          setStatus('success');
          setOrderDetails(data.orderDetails);
        } else {
          throw new Error('Payment was not successful');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setError(error instanceof Error ? error.message : 'Payment verification failed');
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 mb-6">
            <Loader className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Verifying Payment
          </h1>
          <p className="text-lg text-gray-600">
            Please wait while we confirm your payment...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
            <XCircle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Failed
          </h1>
          <p className="text-lg text-red-600 mb-8">
            {error || 'There was an error processing your payment.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              onClick={() => navigate('/order/confirmation')}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Try Again
            </motion.button>
            <motion.button
              onClick={() => navigate('/support')}
              className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Contact Support
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. Your laundry is in good hands!
          </p>
        </div>

        {orderDetails && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Order Number</span>
                <span className="font-medium text-gray-900">{orderDetails.orderNumber}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-medium text-gray-900">
                  €{orderDetails.totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-gray-600">Estimated Delivery</span>
                <span className="font-medium text-gray-900">
                  {new Date(orderDetails.estimatedDelivery).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
          <div className="space-y-3 text-gray-600">
            <p>• You'll receive a confirmation email with your order details</p>
            <p>• We'll notify you when your laundry is picked up</p>
            <p>• Track your order status in the app or website</p>
            <p>• Get updates on delivery progress</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            onClick={() => navigate('/account/orders')}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Order Status
            <ArrowRight className="w-5 h-5 ml-2" />
          </motion.button>

          <motion.button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Back to Home
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default OrderReturn;