import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const EmptyCart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
      <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Your cart is empty</h2>
      <p className="text-gray-600 mb-6">
        {user 
          ? "Looks like you haven't added any items to your cart yet."
          : "Sign in to view your cart or continue shopping as a guest."}
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <motion.button
          onClick={() => navigate('/order/service')}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Browse Services
        </motion.button>
        
        {!user && (
          <motion.button
            onClick={() => navigate('/login', { state: { returnTo: '/cart' } })}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign In
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default EmptyCart;