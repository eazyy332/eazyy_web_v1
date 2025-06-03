import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Quote {
  id: string;
  status: 'pending' | 'quoted' | 'accepted' | 'declined';
  admin_price?: number;
  admin_note?: string;
}

interface QuoteStore {
  quotes: Record<string, Quote>;
  channel: RealtimeChannel | null;
  subscribe: (userId: string) => Promise<void>;
  unsubscribe: () => void;
  updateQuote: (quoteId: string, data: Partial<Quote>) => void;
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  quotes: {},
  channel: null,

  subscribe: async (userId: string) => {
    // Unsubscribe from any existing subscription
    get().unsubscribe();

    // Fetch initial quotes
    const { data: quotes } = await supabase
      .from('custom_price_quotes')
      .select('*')
      .eq('user_id', userId);

    if (quotes) {
      const quotesMap = quotes.reduce((acc, quote) => ({
        ...acc,
        [quote.id]: quote
      }), {});
      set({ quotes: quotesMap });
    }

    // Subscribe to changes
    const channel = supabase
      .channel(`quotes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'custom_price_quotes',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            set((state) => {
              const { [payload.old.id]: _, ...rest } = state.quotes;
              return { quotes: rest };
            });
          } else {
            set((state) => ({
              quotes: {
                ...state.quotes,
                [payload.new.id]: payload.new
              }
            }));
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

  updateQuote: (quoteId: string, data: Partial<Quote>) => {
    set((state) => ({
      quotes: {
        ...state.quotes,
        [quoteId]: {
          ...state.quotes[quoteId],
          ...data
        }
      }
    }));
  }
}));