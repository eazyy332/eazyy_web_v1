import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Order } from '../lib/database.types';

interface OrdersStore {
  orders: Order[];
  channel: RealtimeChannel | null;
  subscribe: () => Promise<void>;
  unsubscribe: () => void;
  updateOrder: (orderId: string, data: Partial<Order>) => void;
}

export const useOrders = create<OrdersStore>((set, get) => ({
  orders: [],
  channel: null,

  subscribe: async () => {
    // Unsubscribe from any existing subscription
    get().unsubscribe();

    // Fetch initial orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (orders) {
      set({ orders });
    }

    // Subscribe to changes
    const channel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            set((state) => ({
              orders: state.orders.filter(order => order.id !== payload.old.id)
            }));
          } else {
            // Fetch full order data including items
            const { data: order } = await supabase
              .from('orders')
              .select('*, order_items(*)')
              .eq('id', payload.new.id)
              .single();

            if (order) {
              set((state) => ({
                orders: state.orders.map(o => 
                  o.id === order.id ? order : o
                )
              }));
            }
          }
        }
      )
      .subscribe();

    set({ channel });
  },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) {
      channel.unsubscribe();
      set({ channel: null });
    }
  },

  updateOrder: (orderId: string, data: Partial<Order>) => {
    set((state) => ({
      orders: state.orders.map(order =>
        order.id === orderId
          ? { ...order, ...data }
          : order
      )
    }));
  }
}));