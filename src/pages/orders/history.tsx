import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Clock, MapPin, RefreshCw } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { format } from 'date-fns';

const OrderHistory: React.FC = () => {
  const navigate = useNavigate();
  const { orders, subscribe, unsubscribe } = useOrders();

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  const completedOrders = orders
    .filter(order => order.status === 'delivered')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleReorder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      navigate('/order/service', {
        state: {
          reorder: true,
          items: order.items,
          service: order.service,
          type: order.type
        }
      });
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order History
            </h1>
            <p className="text-gray-600">
              View your past orders and reorder favorites
            </p>
          </div>
          
          <motion.button
            onClick={() => navigate('/order/service')}
            className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Package className="w-5 h-5 mr-2" />
            New Order
          </motion.button>
        </div>

        {completedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Past Orders</h3>
            <p className="text-gray-600 mb-6">
              When you complete orders, they will appear here
            </p>
            <motion.button
              onClick={() => navigate('/order/service')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Place Your First Order
              <ArrowRight className="w-5 h-5 ml-2" />
            </motion.button>
          </div>
        ) : (
          <div className="space-y-4">
            {completedOrders.map((order) => (
              <motion.div
                key={order.id}
                className="bg-white rounded-xl shadow-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        Delivered
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </div>
                  
                  <div className="mt-4 sm:mt-0 text-right">
                    <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                    <div className="text-xl font-bold text-gray-900">
                      €{order.total_amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start text-gray-600 mb-4">
                  <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{order.shipping_address}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <motion.button
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="text-blue-600 font-medium flex items-center"
                    whileHover={{ x: 5 }}
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </motion.button>

                  <motion.button
                    onClick={() => handleReorder(order.id)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Reorder
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;