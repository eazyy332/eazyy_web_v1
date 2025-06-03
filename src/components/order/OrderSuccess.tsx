import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../components/cart/CartContext';

interface LocationState {
  orderNumber: string;
  totalAmount: number;
  estimatedDelivery: string;
}

const OrderSuccess: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();
  const state = location.state as LocationState;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.orderNumber) {
      navigate('/');
      return;
    }

    const updateOrderStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Checking order:', state.orderNumber);

        // First check if order exists and get its current status
        const { data: orderData, error: checkError } = await supabase
          .from('orders')
          .select('status')
          .eq('order_number', state.orderNumber)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking order:', checkError);
          console.error('Query details:', {
            orderNumber: state.orderNumber,
            query: 'select status from orders where order_number = $1'
          });
          throw new Error(`Failed to fetch order: ${checkError.message}`);
        }

        if (!orderData) {
          console.warn('Order not found:', state.orderNumber);
          throw new Error('Order not found');
        }

        console.log('Found order:', orderData);

        // Only update if order is in pending state
        if (orderData.status === 'pending') {
          console.log('Order status is pending, proceeding with update.');
          
          const { error: updateError } = await supabase
            .from('orders')
            .update({ 
              status: 'awaiting_pickup_customer',
              payment_status: 'paid',
              payment_method: 'test'
            })
            .eq('order_number', state.orderNumber)
            .eq('status', 'pending'); // Extra safety check

          if (updateError) {
            console.error('Error updating order:', updateError);
            throw new Error(`Failed to update order status: ${updateError.message}`);
          }

          console.log('Order updated successfully');
        } else {
          console.log('Order already processed:', orderData.status);
        }

        // Clear the cart after successful order
        clearCart();
      } catch (error) {
        console.error('Error updating order status:', error);
        setError(error instanceof Error ? error.message : 'Failed to update order status');
      } finally {
        setLoading(false);
      }
    };

    updateOrderStatus();
  }, [state?.orderNumber, navigate, user, clearCart]);

  if (!state?.orderNumber) {
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Order Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for your order. Your laundry is in good hands!
          </p>
        </div>

        {state && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Order Number</span>
                <span className="font-medium text-gray-900">{state.orderNumber}</span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-gray-600">Total Amount</span>
                <span className="font-medium text-gray-900">
                  €{state.totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-gray-600">Estimated Delivery</span>
                <span className="font-medium text-gray-900">
                  {typeof state.estimatedDelivery === 'string' 
                    ? new Date(state.estimatedDelivery).toLocaleString() 
                    : state.estimatedDelivery}
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

export default OrderSuccess;