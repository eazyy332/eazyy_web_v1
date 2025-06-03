import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuoteStore } from '../stores/quoteStore';
import QuoteStatusBadge from '../components/order/QuoteStatusBadge';

const Quotes: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { quotes, subscribe, unsubscribe } = useQuoteStore();

  useEffect(() => {
    if (user) {
      subscribe(user.id);
    }
    return () => unsubscribe();
  }, [user, subscribe, unsubscribe]);

  const sortedQuotes = Object.values(quotes).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Custom Price Quotes
            </h1>
            <p className="text-gray-600">
              Track the status of your custom price requests
            </p>
          </div>
          
          <motion.button
            onClick={() => navigate('/order/custom-quote')}
            className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Camera className="w-5 h-5 mr-2" />
            New Quote Request
          </motion.button>
        </div>

        {sortedQuotes.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Quotes Yet</h3>
            <p className="text-gray-600 mb-6">
              Request a quote for items that need special attention or custom pricing
            </p>
            <motion.button
              onClick={() => navigate('/order/custom-quote')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Request Your First Quote
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedQuotes.map((quote) => (
              <motion.div
                key={quote.id}
                className="bg-white rounded-xl shadow-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {quote.item_name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      {quote.description}
                    </p>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  
                  {quote.status === 'quoted' && (
                    <div className="mt-4 sm:mt-0 text-right">
                      <div className="text-sm text-gray-600 mb-1">Quote Amount</div>
                      <div className="text-2xl font-bold text-gray-900">
                        €{quote.admin_price?.toFixed(2)}
                      </div>
                      {quote.admin_note && (
                        <p className="text-sm text-gray-600 mt-1">
                          {quote.admin_note}
                        </p>
                      )}
                      <div className="mt-4 space-x-3">
                        <motion.button
                          onClick={() => navigate('/order/service', {
                            state: { quoteId: quote.id }
                          })}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Accept Quote
                        </motion.button>
                        <motion.button
                          onClick={() => {/* Handle decline */}}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Decline
                        </motion.button>
                      </div>
                    </div>
                  )}
                </div>

                {quote.image_url && quote.image_url.length > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {quote.image_url.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Item preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Quotes;