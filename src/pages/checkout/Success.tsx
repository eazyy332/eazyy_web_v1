import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Package, Loader, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { checkPayment } from '../../api/stripe-service';
import { useCart } from '../../components/cart/CartContext';

const CheckoutSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<{
    orderNumber?: string;
    totalAmount?: number;
    estimatedDelivery?: string;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if we have order details from location state
    if (location.state?.orderNumber) {
      setOrderDetails({
        orderNumber: location.state.orderNumber,
        totalAmount: location.state.totalAmount,
        estimatedDelivery: location.state.estimatedDelivery
      });
      setLoading(false);
      
      // Clear the cart after successful order
      clearCart();
      return;
    }

    // Otherwise, check for payment_intent in URL
    const paymentIntentId = searchParams.get('payment_intent');
    if (!paymentIntentId) {
      setError('No payment information found');
      setLoading(false);
      return;
    }

    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch the order details using the payment intent ID
        const paymentData = await checkPayment(paymentIntentId);
        
        if (paymentData.status !== 'succeeded') {
          throw new Error('Payment was not successful');
        }
        
        // Set order details from the payment
        setOrderDetails({
          orderNumber: paymentData.orderDetails.orderNumber || 'N/A',
          totalAmount: paymentData.orderDetails.totalAmount,
          estimatedDelivery: paymentData.orderDetails.estimatedDelivery
        });
        
        // Clear the cart after successful order
        clearCart();
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [user, location.state, searchParams, navigate, clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Payment Verification Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-gray-600 mb-6">
              Your payment may have been processed, but we couldn't verify it. Please check your email for confirmation or contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => navigate('/account/orders')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Check Your Orders
              </button>
              <button
                onClick={() => navigate('/support')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. Your payment has been processed successfully.
          </p>
        </motion.div>

        {orderDetails && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4">
              {orderDetails.orderNumber && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-medium text-gray-900">{orderDetails.orderNumber}</span>
                </div>
              )}

              {orderDetails.totalAmount !== undefined && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-medium text-gray-900">
                    €{orderDetails.totalAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {orderDetails.estimatedDelivery && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-600">Estimated Delivery</span>
                  <span className="font-medium text-gray-900">
                    {new Date(orderDetails.estimatedDelivery).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div
          className="bg-blue-50 rounded-2xl p-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h3>
          <div className="space-y-3 text-gray-600">
            <p>• You'll receive a confirmation email with your order details</p>
            <p>• We'll notify you when your order is ready</p>
            <p>• You can track your order status in your account</p>
            <p>• Get updates on delivery progress</p>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
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
        </motion.div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;