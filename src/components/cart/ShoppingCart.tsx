import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingBag, 
  Minus, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  Heart, 
  Calendar, 
  Info,
  LogIn
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useServices } from '../../contexts/ServicesContext';
import ServiceCategory from './ServiceCategory';
import EmptyCart from './EmptyCart';
import CartSummary from './CartSummary';
import { useCart } from '../../components/cart/CartContext';

const ShoppingCart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { services } = useServices();
  const { cart, addItem, removeItem, updateQuantity, clearCart, wishlistedItems, toggleWishlist, totalItems, subtotal, tax, total } = useCart();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Just a short delay to simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleQuantityChange = (serviceId: string, itemId: string, change: number) => {
    updateQuantity(serviceId, itemId, change);
  };

  const handleRemoveItem = (serviceId: string, itemId: string) => {
    removeItem(serviceId, itemId);
  };

  const handleClearCart = () => {
    clearCart();
  };

  const handleToggleWishlist = (itemId: string) => {
    if (!user) {
      // Redirect to login if trying to wishlist without being logged in
      navigate('/login', { state: { returnTo: '/cart' } });
      return;
    }
    
    toggleWishlist(itemId);
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  if (Object.keys(cart).length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          </div>
          <EmptyCart />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <motion.button
            onClick={handleClearCart}
            className="flex items-center text-red-600 hover:text-red-700"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cart
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-8">
            {Object.entries(cart).map(([serviceId, { service, items }]) => (
              <ServiceCategory
                key={serviceId}
                serviceId={serviceId}
                serviceName={service.name}
                serviceIcon={service.icon}
                serviceColor={service.color}
                items={items}
                wishlistedItems={wishlistedItems}
                onQuantityChange={(itemId, change) => handleQuantityChange(serviceId, itemId, change)}
                onRemoveItem={(itemId) => handleRemoveItem(serviceId, itemId)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <CartSummary 
              totalItems={totalItems}
              subtotal={subtotal}
              tax={tax}
              total={total}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;