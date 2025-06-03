import React from 'react';
import { motion } from 'framer-motion';
import CheckoutButton from './CheckoutButton';

interface ProductCardProps {
  name: string;
  description: string;
  price?: number;
  priceId: string;
  mode: 'payment' | 'subscription';
  features?: string[];
  popular?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  name,
  description,
  price,
  priceId,
  mode,
  features = [],
  popular = false
}) => {
  return (
    <motion.div
      className={`bg-white rounded-xl shadow-lg overflow-hidden ${
        popular ? 'border-2 border-blue-500' : ''
      }`}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      {popular && (
        <div className="bg-blue-500 text-white text-center py-1 text-sm font-medium">
          Most Popular
        </div>
      )}
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{name}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        {price !== undefined && (
          <div className="text-3xl font-bold text-gray-900 mb-4">
            €{price.toFixed(2)}
            {mode === 'subscription' && <span className="text-sm text-gray-500 ml-1">/month</span>}
          </div>
        )}
        
        {features.length > 0 && (
          <ul className="space-y-2 mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start">
                <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600">{feature}</span>
              </li>
            ))}
          </ul>
        )}
        
        <CheckoutButton priceId={priceId} mode={mode}>
          {mode === 'subscription' ? 'Subscribe Now' : 'Buy Now'}
        </CheckoutButton>
      </div>
    </motion.div>
  );
};

export default ProductCard;