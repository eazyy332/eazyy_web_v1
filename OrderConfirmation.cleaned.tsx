import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Clock, MapPin, Send, ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { nanoid } from 'nanoid';

interface OrderDetails {
  service: string;
  type: string;
  items: { [key: string]: OrderItem };
  pickup_date: string;
  delivery_date?: string;
  pickup_address: string;
  delivery_address?: string;
  pickup_option: string;
  delivery_option?: string;
  special_instructions?: string;
  estimated_pickup_time?: string;
  estimated_dropoff_time?: string;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_custom_quote?: boolean;
}

const OrderConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const orderDetails = location.state as OrderDetails;

  // Calculate totals
  const subtotal = Object.values(orderDetails?.items || {}).reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );

  const tax = subtotal * 0.21; // 21% VAT
  const shippingFee = 0; // Free shipping
  const totalAmount = subtotal + tax + shippingFee;

  // Check if any items are custom quotes
  const isCustomQuoteOrder = orderDetails?.type === 'quote';

  const handleSkipPayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Generate unique order number
      const orderNumber = `EZY${nanoid(6).toUpperCase()}`;

      // Get coordinates for the address using Google Maps Geocoding API
      const geocoder = new google.maps.Geocoder();
      const addressToGeocode = orderDetails.pickup_address;

      const geocodeResult = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: addressToGeocode }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            resolve(results[0].geometry.location);
          } else {
            reject(new Error('Geocoding failed'));
          }
        });
      });

      const location = geocodeResult as google.maps.LatLng;
      const latitude = location.lat().toString();
      const longitude = location.lng().toString();

      // Create base order data object
      const orderData: any = {
        order_number: orderNumber,
        user_id: user?.id,
        customer_name: `${user?.user_metadata.first_name || ''} ${user?.user_metadata.last_name || ''}`.trim(),
        email: user?.email,
        phone: user?.user_metadata.phone,
        shipping_address: orderDetails.pickup_address,
        shipping_method: orderDetails.pickup_option,
        pickup_date: orderDetails.pickup_date,
        delivery_date: orderDetails.delivery_date,
        special_instructions: orderDetails.special_instructions,
        subtotal,
        tax,
        shipping_fee: shippingFee,
        total_amount: totalAmount,
        status: isCustomQuoteOrder ? 'pending' : 'awaiting_pickup_customer',
        payment_status: 'pending',
        latitude,
        longitude,
        type: orderDetails.type || 'delivery',
        is_pickup_completed: false,
        is_facility_processing: false,
        is_dropoff_completed: false,
        order_type: isCustomQuoteOrder ? 'custom_quote' : 'standard',
        quote_status: isCustomQuoteOrder ? 'pending' : 'none',
        estimated_pickup_time: orderDetails.estimated_pickup_time,
        estimated_dropoff_time: orderDetails.estimated_dropoff_time
      };

      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = Object.values(orderDetails.items).map(item => ({
        order_id: insertedOrder.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Navigate to success page
      navigate('/order/success', {
        state: {
          orderNumber: insertedOrder.order_number,
          totalAmount,
          estimatedDelivery: orderDetails.delivery_date || orderDetails.pickup_date
        }
      });
    } catch (error) {
      console.error('Error saving order:', error);
      setError(error instanceof Error ? error.message : 'Failed to save order');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-4xl mx-auto"
      >
        {/* Order Details */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Order Details</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-600">Pickup Date</span>
              </div>
              <span className="font-medium text-gray-900">
                {new Date(orderDetails?.pickup_date).toLocaleString()}
              </span>
            </div>

            {orderDetails?.delivery_date && (
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">Delivery Date</span>
                </div>
                <span className="font-medium text-gray-900">
                  {new Date(orderDetails.delivery_date).toLocaleString()}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-600">Pickup Address</span>
              </div>
              <span className="font-medium text-gray-900">{orderDetails?.pickup_address}</span>
            </div>

            {orderDetails?.delivery_date && orderDetails?.delivery_address && (
              <div className="flex justify-between items-center py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">Delivery Address</span>
                </div>
                <span className="font-medium text-gray-900">{orderDetails.delivery_address}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-3">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <span className="text-gray-600">Total Items</span>
              </div>
              <span className="font-medium text-gray-900">
                {Object.values(orderDetails?.items || {}).reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            {/* Price Breakdown */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>VAT (21%)</span>
                  <span>€{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <span className="text-lg font-medium text-gray-900">
                    Total Price
                  </span>
                  <span className="text-2xl font-bold text-gray-900">€{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Quote Notice */}
        {hasCustomQuoteItems && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-amber-800 mb-1">Custom Quote Required</h3>
                <p className="text-amber-700 text-sm">
                  Your order contains items that require a custom quote. After placing your order, our team will review it and provide a price quote for your approval before processing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Error</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <motion.button
            onClick={() => window.print()}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Package className="w-5 h-5 mr-2" />
            Print Receipt
          </motion.button>

          <motion.button
            onClick={handleSkipPayment}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            whileHover={{ scale: loading ? 1 : 1.05 }}
            whileTap={{ scale: loading ? 1 : 0.95 }}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </div>
            ) : (
              <>
                <Package className="w-5 h-5 mr-2" />
                Skip Payment (Test Mode)
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrderConfirmation;