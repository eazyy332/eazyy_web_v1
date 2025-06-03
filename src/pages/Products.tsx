import React from 'react';
import { motion } from 'framer-motion';
import { Shirt, Package, Wind, Scissors } from 'lucide-react';
import ProductCard from '../components/stripe/ProductCard';
import { stripeProducts } from '../stripe-config';

const Products: React.FC = () => {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.h1 
            className="text-4xl font-bold text-gray-900 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Our Services
          </motion.h1>
          <motion.p 
            className="text-lg text-gray-600 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Professional laundry and dry cleaning services tailored to your needs
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Shirt Dry Cleaning Product */}
          <ProductCard
            name={stripeProducts.shirtDryCleaning.name}
            description={stripeProducts.shirtDryCleaning.description}
            price={5.00}
            priceId={stripeProducts.shirtDryCleaning.priceId}
            mode={stripeProducts.shirtDryCleaning.mode as 'payment' | 'subscription'}
            features={[
              'Professional dry cleaning',
              'Stain removal',
              'Gentle care for delicate fabrics',
              'Pressed and ready to wear',
              'Eco-friendly cleaning agents'
            ]}
            popular={true}
          />

          {/* Other service cards for visual balance */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Regular Laundry</h3>
              <p className="text-gray-600 mb-4">Weight-based washing perfect for regular laundry</p>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                €24.99
                <span className="text-sm text-gray-500 ml-1">/bag</span>
              </div>
              <button className="w-full px-6 py-3 bg-gray-200 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Scissors className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Repairs & Alterations</h3>
              <p className="text-gray-600 mb-4">Expert mending and alterations services</p>
              <div className="text-3xl font-bold text-gray-900 mb-4">
                €3.99
                <span className="text-sm text-gray-500 ml-1">/repair</span>
              </div>
              <button className="w-full px-6 py-3 bg-gray-200 text-gray-500 rounded-xl font-medium cursor-not-allowed">
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Need Custom Services?</h2>
          <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
            We offer custom pricing for special items and bulk orders. Contact us for a personalized quote.
          </p>
          <motion.button
            onClick={() => window.location.href = '/contact'}
            className="px-8 py-4 bg-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Get a Custom Quote
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Products;