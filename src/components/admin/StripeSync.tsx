import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Check, AlertTriangle, ArrowRight } from 'lucide-react';
import { syncStripeProducts, getStripeProducts } from '../../api/stripe-service';

const StripeSync: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  const handleSync = async () => {
    try {
      setLoading(true);
      setError(null);
      setSyncResult(null);
      
      const result = await syncStripeProducts();
      setSyncResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync with Stripe');
    } finally {
      setLoading(false);
    }
  };

  const handleGetProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getStripeProducts();
      setProducts(result.products || []);
      setShowProducts(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get Stripe products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Stripe Products Sync</h2>
      
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {syncResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-start">
              <Check className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-green-800 mb-1">Sync Completed</h3>
                <div className="text-green-700 text-sm">
                  <p>Total items: {syncResult.counts.total}</p>
                  <p>Created: {syncResult.counts.created}</p>
                  <p>Updated: {syncResult.counts.updated}</p>
                  <p>Unchanged: {syncResult.counts.unchanged}</p>
                  <p>Deactivated: {syncResult.counts.deactivated}</p>
                  <p>Errors: {syncResult.counts.errors}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4">
          <motion.button
            onClick={handleSync}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl font-medium disabled:bg-blue-300"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5 mr-2" />
            )}
            Sync Products with Stripe
          </motion.button>
          
          <motion.button
            onClick={handleGetProducts}
            disabled={loading}
            className="flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium disabled:bg-gray-200"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            View Stripe Products
          </motion.button>
        </div>
        
        {showProducts && products.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stripe Products</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => {
                    const price = product.default_price;
                    const unitAmount = price?.unit_amount ? price.unit_amount / 100 : null;
                    
                    return (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {unitAmount !== null ? (
                            <div className="text-sm text-gray-900">€{unitAmount.toFixed(2)}</div>
                          ) : (
                            <div className="text-sm text-gray-500">Custom pricing</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.metadata.category || 'Uncategorized'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {product.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripeSync;