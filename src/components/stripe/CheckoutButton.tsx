import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CheckoutButtonProps {
  priceId: string;
  mode: 'payment' | 'subscription';
  children: React.ReactNode;
  className?: string;
}

const CheckoutButton: React.FC<CheckoutButtonProps> = ({ 
  priceId, 
  mode, 
  children, 
  className = "px-6 py-3 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
}) => {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = async () => {
    if (!user) {
      // Store the price ID and mode in localStorage to resume after login
      localStorage.setItem('checkout_price_id', priceId);
      localStorage.setItem('checkout_mode', mode);
      navigate('/login', { state: { returnTo: window.location.pathname } });
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/checkout/canceled`,
          mode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to initiate checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.button
      onClick={handleCheckout}
      className={className}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      disabled={loading}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <Loader className="w-5 h-5 mr-2 animate-spin" />
          <span>Processing...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default CheckoutButton;