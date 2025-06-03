import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, Clock, MapPin } from 'lucide-react';
import { useOrders } from '../../hooks/useOrders';
import { format } from 'date-fns';

const ActiveOrders: React.FC = () => {
  const navigate = useNavigate();
  const { orders, subscribe, unsubscribe } = useOrders();

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, [subscribe, unsubscribe]);

  const activeOrders = orders.filter(order => 
    ['awaiting_pickup_customer', 'in_transit_to_facility', 'arrived_at_facility', 
     'processing', 'ready_for_delivery', 'in_transit_to_customer'].includes(order.status)
  ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'awaiting_pickup_customer':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit_to_facility':
        return 'bg-purple-100 text-purple-800';
      case 'arrived_at_facility':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-cyan-100 text-cyan-800';
      case 'ready_for_delivery':
        return 'bg-green-100 text-green-800';
      case 'in_transit_to_customer':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Active Orders
            </h1>
            <p className="text-gray-600">
              Track your orders in real-time
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

        {activeOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
            <p className="text-gray-600 mb-6">
              You don't have any orders in progress at the moment
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
            {activeOrders.map((order) => (
              <motion.div
                key={order.id}
                className="bg-white rounded-xl shadow-lg p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => navigate(`/orders/${order.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex flex-col sm:flex-row items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order.order_number}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
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

                <div className="flex items-start text-gray-600">
                  <MapPin className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{order.shipping_address}</span>
                </div>

                <div className="mt-4 flex justify-end">
                  <motion.button
                    className="text-blue-600 font-medium flex items-center"
                    whileHover={{ x: 5 }}
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 ml-1" />
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

export default ActiveOrders;