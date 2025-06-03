import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import QuoteDetailView from '../../components/quotes/QuoteDetailView';

const QuoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchQuote();
  }, [id, user]);

  const fetchQuote = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('custom_price_quotes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Quote not found');

      setQuote(data);
    } catch (err) {
      console.error('Error fetching quote:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async () => {
    try {
      if (quote.status !== 'quoted') {
        throw new Error('Can only accept quotes in "quoted" status');
      }

      const { error: updateError } = await supabase
        .from('custom_price_quotes')
        .update({ status: 'accepted' })
        .eq('id', quote.id)
        .eq('status', 'quoted');

      if (updateError) throw updateError;

      // Create order item from quote
      const orderItem = {
        id: quote.id,
        name: quote.item_name,
        description: quote.description,
        price: quote.admin_price || quote.suggested_price,
        quantity: 1,
        is_custom_quote: false
      };

      // Navigate to address selection with item in cart
      navigate('/order/address', {
        state: {
          service: 'custom',
          items: {
            [quote.id]: orderItem
          },
          type: 'standard'
        }
      });
    } catch (error) {
      console.error('Error accepting quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to accept quote');
    }
  };

  const handleDeclineQuote = async () => {
    try {
      if (quote.status !== 'quoted') {
        throw new Error('Can only decline quotes in "quoted" status');
      }

      const { error } = await supabase
        .from('custom_price_quotes')
        .update({ status: 'declined' })
        .eq('id', quote.id)
        .eq('status', 'quoted');

      if (error) throw error;
      
      // Navigate back to quotes list
      navigate('/account/quotes');
    } catch (error) {
      console.error('Error declining quote:', error);
      setError(error instanceof Error ? error.message : 'Failed to decline quote');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-24 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error || 'Quote not found'}</p>
            <button
              onClick={() => navigate('/account/quotes')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              Back to Quotes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Add facility name and estimated days to the quote object
  const enhancedQuote = {
    ...quote,
    facility_name: 'Eazyy Facility Amsterdam',
    estimated_days: 3
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto">
        <QuoteDetailView
          quote={enhancedQuote}
          onAccept={handleAcceptQuote}
          onDecline={handleDeclineQuote}
        />
      </div>
    </div>
  );
};

export default QuoteDetailPage;