import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Package, Camera } from 'lucide-react';

const NewOrder: React.FC = () => {
  const navigate = useNavigate();

  const orderTypes = [
    {
      id: 'standard',
      title: 'Standard Order',
      description: 'Choose from our regular services with fixed pricing',
      icon: Package,
      color: 'bg-blue-600',
      lightColor: 'bg-blue-50'
    },
    {
      id: 'quote',
      title: 'Request a Quote',
      description: 'Get a custom quote for special items or bulk orders',
      icon: Camera,
      color: 'bg-cyan-600',
      lightColor: 'bg-cyan-50'
    }
  ];

  const handleOrderTypeSelect = (type: string) => {
    if (type === 'standard') {
      navigate('/order/service', { state: { type: 'standard' } });
    } else {
      navigate('/order/custom-quote', { state: { type: 'quote' } });
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
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Start New Order
          </h1>
          <p className="text-lg text-gray-600">
            Choose how you'd like to proceed with your order
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {orderTypes.map((type) => (
            <motion.div
              key={type.id}
              onClick={() => handleOrderTypeSelect(type.id)}
              className={`${type.lightColor} rounded-2xl p-6 shadow hover:shadow-lg cursor-pointer transition-all duration-300`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={`w-14 h-14 ${type.color} rounded-xl flex items-center justify-center text-white mb-4`}>
                <type.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{type.title}</h3>
              <p className="text-gray-600">{type.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default NewOrder;