import React from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Heart, Trash2, ShoppingBag } from 'lucide-react';
import LazyImage from '../LazyImage';

interface CartItemProps {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image?: string;
  serviceColor: string;
  isWishlisted: boolean;
  custom_input_value?: number;
  calculated_price?: number;
  unit_label?: string;
  onQuantityChange: (change: number) => void;
  onRemove: () => void;
  onToggleWishlist: () => void;
}

const CartItem: React.FC<CartItemProps> = ({
  id,
  name,
  price,
  quantity,
  description,
  image,
  serviceColor,
  isWishlisted,
  custom_input_value,
  calculated_price,
  unit_label,
  onQuantityChange,
  onRemove,
  onToggleWishlist
}) => {
  // Check if serviceColor is a hex color
  const isHexColor = serviceColor.startsWith('#');
  
  // Get the appropriate background color style
  const getButtonStyle = () => {
    if (isHexColor) {
      return { backgroundColor: serviceColor };
    }
    return {};
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 last:border-0 last:pb-0">
      <div className="flex-1 mb-4 sm:mb-0">
        <div className="flex items-start">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
            {image ? (
              <LazyImage 
                src={image} 
                alt={name} 
                className="w-full h-full object-cover rounded-lg" 
                width="64"
                height="64"
              />
            ) : (
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <motion.button
                onClick={onToggleWishlist}
                className="ml-2"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart 
                  className={`w-5 h-5 ${
                    isWishlisted 
                      ? 'text-red-500 fill-red-500' 
                      : 'text-gray-300'
                  }`} 
                />
              </motion.button>
            </div>
            <p className="text-gray-600 text-sm">{description}</p>
            {custom_input_value && (
              <p className="text-gray-600 text-sm mt-1">
                {custom_input_value} {unit_label} × €{price.toFixed(2)}/{unit_label}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end sm:space-x-6">
        <div className="flex items-center space-x-3">
          <motion.button
            onClick={() => onQuantityChange(-1)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Decrease quantity"
          >
            <Minus className="w-4 h-4" />
          </motion.button>
          
          <span className="w-8 text-center font-medium">
            {quantity}
          </span>
          
          <motion.button
            onClick={() => onQuantityChange(1)}
            style={getButtonStyle()}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${!isHexColor ? serviceColor : ''}`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Increase quantity"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
        
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">
            €{calculated_price?.toFixed(2) || (price * quantity).toFixed(2)}
          </p>
          <motion.button
            onClick={onRemove}
            className="text-sm text-red-600 hover:text-red-700 mt-1 flex items-center justify-end"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Remove
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;