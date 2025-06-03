import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCart } from './CartContext';

interface CartSummaryProps {
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
  hasDiscount?: boolean;
  discountAmount?: number;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  totalItems,
  subtotal,
  tax,
  total,
  hasDiscount = false,
  discountAmount = 0
}) => {
  const navigate = useNavigate();
  const { cart } = useCart();

  const handleProceedToCheckout = () => {
    navigate('/order/address', { 
      state: { 
        items: Object.values(cart).reduce((allItems, service) => {
          service.items.forEach(item => {
            allItems[item.id] = item;
          });
          return allItems;
        }, {} as Record<string, any>),
        service: Object.keys(cart)[0], // Use the first service as the primary service
        type: 'standard' // Default to standard order type
      }
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Items</span>
          <span className="font-medium">{totalItems}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">€{subtotal.toFixed(2)}</span>
        </div>
        {hasDiscount && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-€{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">VAT (21%)</span>
          <span className="font-medium">€{tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping</span>
          <span className="font-medium text-green-600">Free</span>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-gray-900">€{total.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center text-gray-600">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          <span>Estimated service time: 24-48 hours</span>
        </div>
        <div className="flex items-center text-gray-600">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          <span>Available for pickup: Tomorrow</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <motion.button
          onClick={() => navigate('/order/service')}
          className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Continue Shopping
        </motion.button>
        
        <motion.button
          onClick={handleProceedToCheckout}
          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Proceed to Checkout
          <ArrowRight className="w-5 h-5 ml-2" />
        </motion.button>
      </div>
    </div>
  );
};

export default CartSummary;
