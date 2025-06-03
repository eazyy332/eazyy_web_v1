import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, X, ArrowLeft, Camera, ExternalLink, Info, AlertTriangle, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { confirmItemDiscrepancy } from '../../../api/order-service';
import type { Order, OrderItem } from '../../../lib/database.types';

interface DiscrepancyItem {
  id: string;
  order_id: string;
  original_order_item_id: string | null;
  product_name: string;
  expected_quantity: number | null;
  actual_quantity: number;
  unit_price: number | null;
  service_type: string | null;
  notes: string | null;
  photo_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  is_temporary: boolean;
  category_name?: string;
  service_name?: string;
  product_id?: string;
  service_id?: string;
  category_id?: string;
  original_order_item?: {
    product_id: string;
    service_id: string;
    service_name: string;
    category_id: string;
    category_name: string;
  };
}

const ItemConfirmation: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);
  const [updatedItems, setUpdatedItems] = useState<any[]>([]);
  const [discrepancyItems, setDiscrepancyItems] = useState<DiscrepancyItem[]>([]);
  const [priceChange, setPriceChange] = useState<{
    originalTotal: number;
    newTotal: number;
    difference: number;
  } | null>(null);

  useEffect(() => {
    if (!user) {
      // Store return path
      localStorage.setItem('returnTo', `/orders/item-confirmation/${orderId}`);
      navigate('/login');
      return;
    }

    if (!orderId) {
      setError('Order ID is missing');
      setLoading(false);
      return;
    }

    fetchOrderDetails();
  }, [user, orderId, navigate]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching order details for order ID:', orderId);

      // Fetch order details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        throw orderError;
      }
      
      if (!orderData) {
        console.error('Order not found');
        throw new Error('Order not found');
      }

      console.log('Order data:', orderData);

      // Verify order belongs to user
      if (orderData.user_id !== user?.id) {
        console.error('Unauthorized: Order user_id does not match current user');
        throw new Error('Unauthorized');
      }

      // Verify order is in correct state
      if (orderData.status !== 'pending_item_confirmation') {
        console.error('Order is not in pending_item_confirmation state:', orderData.status);
        throw new Error('Order is not awaiting item confirmation');
      }

      // Fetch discrepancy items
      const { data: discrepancyData, error: discrepancyError } = await supabase
        .from('discrepancy_items')
        .select(`
          *,
          original_order_item:original_order_item_id (
            product_id,
            service_id,
            service_name,
            category_id,
            category_name
          )
        `)
        .eq('order_id', orderId);

      if (discrepancyError) {
        console.error('Error fetching discrepancy items:', discrepancyError);
        throw discrepancyError;
      }

      console.log('Discrepancy items:', discrepancyData);

      setOrder(orderData);
      setOriginalItems(orderData.order_items || []);
      setDiscrepancyItems(discrepancyData || []);

      // Process updated items
      if (orderData.facility_updated_items) {
        // Parse JSON if it's a string
        const updatedItemsList = typeof orderData.facility_updated_items === 'string' 
          ? JSON.parse(orderData.facility_updated_items)
          : orderData.facility_updated_items;

        // Ensure we have an array
        if (!Array.isArray(updatedItemsList)) {
          console.warn('facility_updated_items is not an array:', updatedItemsList);
          setUpdatedItems([]);
        } else {
          console.log('Updated items list:', updatedItemsList);
          
          const itemsWithDifference = updatedItemsList.map(updatedItem => {
            const originalItem = orderData.order_items?.find(item => 
              item.product_id === updatedItem.product_id
            );
            return {
              ...updatedItem,
              quantity_difference: updatedItem.quantity - (originalItem?.quantity || 0)
            };
          });
          
          setUpdatedItems(itemsWithDifference);

          // Calculate price difference
          const originalTotal = orderData.order_items?.reduce(
            (sum, item) => sum + (item.unit_price * item.quantity), 
            0
          ) || 0;

          const newTotal = itemsWithDifference.reduce(
            (sum, item) => sum + (item.unit_price * item.quantity), 
            0
          );

          setPriceChange({
            originalTotal,
            newTotal,
            difference: newTotal - originalTotal
          });
        }
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      setError(error instanceof Error ? error.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'accepted' | 'declined') => {
    try {
      setSubmitting(true);
      setError(null);

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      // Call API to update order with customer's decision
      await confirmItemDiscrepancy(orderId, decision);

      // Navigate to orders page with success message
      navigate('/account/orders', { 
        state: { 
          message: decision === 'accepted' 
            ? 'You have approved the updated items. Your order is now being processed.' 
            : 'You have declined the updated items. Your order will be processed with the original items.'
        }
      });
    } catch (error) {
      console.error('Error updating decision:', error);
      setError(error instanceof Error ? error.message : 'Failed to update decision');
      setSubmitting(false);
    }
  };

  const getItemDifferenceIcon = (difference: number) => {
    if (difference > 0) return <Plus className="w-4 h-4 text-green-600" />;
    if (difference < 0) return <Minus className="w-4 h-4 text-red-600" />;
    return <Check className="w-4 h-4 text-blue-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <motion.button
              onClick={() => navigate('/account/orders')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back to Orders
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-red-50 rounded-xl p-6 border border-red-100">
            <h2 className="text-xl font-bold text-red-700 mb-2">Order Not Found</h2>
            <p className="text-red-600 mb-4">The requested order could not be found.</p>
            <motion.button
              onClick={() => navigate('/account/orders')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back to Orders
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <motion.button
              onClick={() => navigate('/account/orders')}
              className="text-gray-600 hover:text-gray-900"
              whileHover={{ x: -5 }}
            >
              <ArrowLeft className="w-6 h-6" />
            </motion.button>
            <h1 className="text-2xl font-bold text-gray-900">
              Item Discrepancy Review
            </h1>
          </div>
          <p className="text-gray-600">
            Order #{order.order_number}
          </p>
        </div>

        {/* Alert Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-amber-800 mb-1">Item Confirmation Needed</h3>
              <p className="text-amber-700 text-sm">
                We found a difference between the items you submitted and the items received by our facility. 
                Please review the updated list below and confirm so we can begin cleaning.
              </p>
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Original Items */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              What You Ordered
            </h2>
            <div className="space-y-4">
              {originalItems.length > 0 ? (
                originalItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      {item.service_name && (
                        <p className="text-xs text-gray-500">Service: {item.service_name}</p>
                      )}
                      {item.category_name && (
                        <p className="text-xs text-gray-500">Category: {item.category_name}</p>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">
                      €{(item.unit_price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No original items found</p>
              )}
            </div>
          </div>

          {/* Updated Items / Discrepancy Items */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              What We Received
            </h2>
            <div className="space-y-4">
              {discrepancyItems.length > 0 ? (
                // Display discrepancy items if available
                discrepancyItems.map((item) => {
                  const originalItem = originalItems.find(oi => oi.id === item.original_order_item_id);
                  const quantityDifference = item.actual_quantity - (item.expected_quantity || originalItem?.quantity || 0);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex justify-between items-start ${
                        quantityDifference !== 0 ? 'bg-yellow-50 p-4 rounded-lg' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center">
                          <span className="mr-2">{getItemDifferenceIcon(quantityDifference)}</span>
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-600">
                              Quantity: {item.actual_quantity}
                            </p>
                            {quantityDifference !== 0 && (
                              <span className={`text-sm ${
                                quantityDifference > 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                ({quantityDifference > 0 ? '+' : ''}{quantityDifference})
                              </span>
                            )}
                          </div>
                          {item.service_name && (
                            <p className="text-xs text-gray-500">Service: {item.service_name}</p>
                          )}
                          {item.category_name && (
                            <p className="text-xs text-gray-500">Category: {item.category_name}</p>
                          )}
                          {item.notes && (
                            <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                          )}
                        </div>
                      </div>
                      <p className="font-medium text-gray-900">
                        €{((item.unit_price || 0) * item.actual_quantity).toFixed(2)}
                      </p>
                    </div>
                  );
                })
              ) : updatedItems.length > 0 ? (
                // Fall back to updated items if no discrepancy items
                updatedItems.map((item) => (
                  <div 
                    key={`${item.product_id}`} 
                    className={`flex justify-between items-start ${
                      item.quantity_difference !== 0 ? 'bg-yellow-50 p-4 rounded-lg' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center">
                        <span className="mr-2">{getItemDifferenceIcon(item.quantity_difference)}</span>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity}
                          </p>
                          {item.quantity_difference !== 0 && (
                            <span className={`text-sm ${
                              item.quantity_difference > 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              ({item.quantity_difference > 0 ? '+' : ''}{item.quantity_difference})
                            </span>
                          )}
                        </div>
                        {item.service_name && (
                          <p className="text-xs text-gray-500">Service: {item.service_name}</p>
                        )}
                        {item.category_name && (
                          <p className="text-xs text-gray-500">Category: {item.category_name}</p>
                        )}
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">
                      €{(item.unit_price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 italic">No discrepancy information available</p>
              )}
            </div>
          </div>
        </div>

        {/* Facility Notes */}
        {order.facility_notes && (
          <div className="bg-blue-50 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
              <Info className="w-5 h-5 text-blue-600 mr-2" />
              Facility Comment
            </h3>
            <p className="text-gray-700 whitespace-pre-line">
              {order.facility_notes}
            </p>
          </div>
        )}

        {/* Price Change Summary */}
        {priceChange && priceChange.difference !== 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Updated Price Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Original Subtotal</span>
                <span className="text-gray-700">€{priceChange.originalTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New Subtotal</span>
                <span className="text-gray-700">€{priceChange.newTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">VAT (21%)</span>
                <span className="text-gray-700">€{(priceChange.newTotal * 0.21).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between items-center font-medium">
                  <span className="text-gray-800">Updated Total</span>
                  <span className="text-lg text-gray-900">€{(priceChange.newTotal * 1.21).toFixed(2)}</span>
                </div>
                <div className="flex justify-end mt-1">
                  <span className={`text-sm ${priceChange.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {priceChange.difference > 0 ? '+' : ''}€{priceChange.difference.toFixed(2)} difference
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Evidence */}
        {order.item_discrepancy_photo_url && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Camera className="w-5 h-5 text-gray-700 mr-2" />
              Photo Evidence
            </h3>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <img
                src={order.item_discrepancy_photo_url}
                alt="Item discrepancy evidence"
                className="absolute inset-0 w-full h-full object-contain"
              />
              <motion.a
                href={order.item_discrepancy_photo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-2 right-2 p-2 bg-white/80 rounded-lg hover:bg-white"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ExternalLink className="w-5 h-5 text-gray-600" />
              </motion.a>
            </div>
          </div>
        )}

        {/* Individual Discrepancy Photos */}
        {discrepancyItems.some(item => item.photo_url) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Camera className="w-5 h-5 text-gray-700 mr-2" />
              Item Photos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {discrepancyItems.filter(item => item.photo_url).map((item) => (
                <div key={`photo-${item.id}`} className="relative">
                  <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={item.photo_url || ''}
                      alt={`${item.product_name} evidence`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-white text-sm p-2 rounded">
                    {item.product_name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-800 mb-1">Error</h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <motion.button
            onClick={() => handleDecision('declined')}
            disabled={submitting}
            className="flex items-center justify-center px-6 py-3 bg-red-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: submitting ? 1 : 1.05 }}
            whileTap={{ scale: submitting ? 1 : 0.95 }}
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </div>
            ) : (
              <>
                <X className="w-5 h-5 mr-2" />
                Reject Changes
              </>
            )}
          </motion.button>

          <motion.button
            onClick={() => handleDecision('accepted')}
            disabled={submitting}
            className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: submitting ? 1 : 1.05 }}
            whileTap={{ scale: submitting ? 1 : 0.95 }}
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </div>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Approve Changes
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ItemConfirmation;