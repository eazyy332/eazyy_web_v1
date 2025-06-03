import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, Search, Filter } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AccountLayout from './AccountLayout';
import QuoteCard from './QuoteCard';

interface Quote {
  id: string;
  item_name: string;
  description: string;
  status: 'pending' | 'quoted' | 'accepted' | 'declined';
  urgency: 'standard' | 'express';
  created_at: string;
  suggested_price?: number;
  image_url: string[];
  admin_price?: number;
  admin_note?: string;
  order_id?: string;
  order_number?: string;
}

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      fetchQuotes();
    }
  }, [user]);

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_price_quotes')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterQuotes = (quote: Quote) => {
    // Search filter
    const searchMatch = 
      quote.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (quote.order_number && quote.order_number.toLowerCase().includes(searchTerm.toLowerCase()));

    // Status filter
    const statusMatch = filters.status === 'all' || quote.status === filters.status;

    // Date range filter
    let dateMatch = true;
    const quoteDate = new Date(quote.created_at);
    const now = new Date();
    switch (filters.dateRange) {
      case 'today':
        dateMatch = quoteDate.toDateString() === now.toDateString();
        break;
      case 'week':
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        dateMatch = quoteDate >= weekAgo;
        break;
      case 'month':
        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
        dateMatch = quoteDate >= monthAgo;
        break;
    }

    return searchMatch && statusMatch && dateMatch;
  };

  const filteredQuotes = quotes.filter(filterQuotes);

  return (
    <AccountLayout activeTab="quotes">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <motion.h2 
            className="text-2xl font-bold text-gray-900"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Custom Price Quotes
          </motion.h2>
          
          <motion.button
            onClick={() => navigate('/order/custom-quote')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Camera className="w-5 h-5 mr-2" />
            Request New Quote
          </motion.button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search quotes..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 shadow-sm"
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {['all', 'pending', 'quoted', 'accepted', 'declined'].map((status) => (
                <motion.button
                  key={status}
                  onClick={() => setFilters(prev => ({ ...prev, status }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                    filters.status === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {status === 'all' ? 'All' : status}
                </motion.button>
              ))}
            </div>

            <motion.button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Filter className="w-4 h-4 mr-1" />
              {showFilters ? 'Hide Filters' : 'More Filters'}
            </motion.button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-50 rounded-xl p-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="flex flex-wrap gap-2">
                    {['all', 'today', 'week', 'month'].map((range) => (
                      <motion.button
                        key={range}
                        onClick={() => setFilters(prev => ({ ...prev, dateRange: range }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${
                          filters.dateRange === range
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {range === 'all' ? 'All Time' : 
                         range === 'week' ? 'Last 7 Days' : 
                         range === 'month' ? 'Last 30 Days' : 'Today'}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quotes List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading quotes...</p>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Quotes Found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || filters.status !== 'all' || filters.dateRange !== 'all'
                ? 'Try adjusting your filters'
                : 'Request a quote for your special items'}
            </p>
            <motion.button
              onClick={() => navigate('/order/custom-quote')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg inline-flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Camera className="w-4 h-4 mr-2" />
              Request Your First Quote
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuotes.map((quote) => (
              <QuoteCard key={quote.id} quote={quote} />
            ))}
          </div>
        )}
      </div>
    </AccountLayout>
  );
};

export default Quotes;