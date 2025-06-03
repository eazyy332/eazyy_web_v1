import { toast } from 'react-hot-toast';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const useToast = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Subscribe to quote status changes
    const quoteChannel = supabase
      .channel('quote-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'custom_price_quotes',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const { new: newQuote } = payload;
          
          switch (newQuote.status) {
            case 'quoted':
              toast.success('Your quote is ready! Check your quotes page for details.', {
                duration: 5000,
                icon: '💰'
              });
              break;
            case 'accepted':
              toast.success('Quote accepted! Proceeding with your order.', {
                duration: 5000,
                icon: '✅'
              });
              break;
          }
        }
      )
      .subscribe();

    // Subscribe to order status changes
    const orderChannel = supabase
      .channel('order-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const { new: newOrder } = payload;
          
          switch (newOrder.status) {
            case 'ready_for_delivery':
              toast.success('Your order is ready for delivery!', {
                duration: 5000,
                icon: '📦'
              });
              break;
            case 'in_transit_to_customer':
              toast.success('Driver is on the way with your order!', {
                duration: 5000,
                icon: '🚚'
              });
              break;
            case 'delivered':
              toast.success('Order delivered! Thank you for using Eazyy.', {
                duration: 5000,
                icon: '✨'
              });
              break;
          }
        }
      )
      .subscribe();

    return () => {
      quoteChannel.unsubscribe();
      orderChannel.unsubscribe();
    };
  }, [user]);
};

export default useToast;