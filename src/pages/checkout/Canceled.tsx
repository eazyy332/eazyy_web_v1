import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, ShoppingBag, AlertTriangle } from 'lucide-react';

const CheckoutCanceled: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 mb-6">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Payment Canceled
          </h1>
          <p className="text-lg text-gray-600">
            Your payment was not processed. No charges were made.
          </p>
        </motion.div>

        <motion.div
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-start mb-6">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900 mb-2">What happened?</h3>
              <p className="text-gray-600">
                Your payment process was canceled. This could be because:
              </p>
              <ul className="mt-2 space-y-1 text-gray-600 list-disc list-inside">
                <li>You chose to cancel the payment</li>
                <li>There was an issue with your payment method</li>
                <li>The session timed out</li>
              </ul>
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-4">What would you like to do next?</h2>
          
          <div className="space-y-4 text-gray-600">
            <p>• Return to the checkout page to try again</p>
            <p>• Continue shopping for other items</p>
            <p>• Contact customer support if you need assistance</p>
          </div>
        </motion.div>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.button
            onClick={() => navigate('/order/confirmation')}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Return to Checkout
          </motion.button>

          <motion.button
            onClick={() => navigate('/order/service')}
            className="w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300 flex items-center justify-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Continue Shopping
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default CheckoutCanceled;