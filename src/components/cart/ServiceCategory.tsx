import React from 'react';
import { ShoppingBag, Shirt, Wind, Scissors, Brush } from 'lucide-react';
import CartItem from './CartItem';

interface CartItemType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  description?: string;
  image?: string;
  custom_input_value?: number;
  calculated_price?: number;
  unit_label?: string;
}

interface ServiceCategoryProps {
  serviceId: string;
  serviceName: string;
  serviceIcon: string;
  serviceColor: string;
  items: CartItemType[];
  wishlistedItems: string[];
  onQuantityChange: (itemId: string, change: number) => void;
  onRemoveItem: (itemId: string) => void;
  onToggleWishlist: (itemId: string) => void;
}

const ServiceCategory: React.FC<ServiceCategoryProps> = ({
  serviceId,
  serviceName,
  serviceIcon,
  serviceColor,
  items,
  wishlistedItems,
  onQuantityChange,
  onRemoveItem,
  onToggleWishlist
}) => {
  const getIconComponent = (iconName: string) => {
    // Map icon names to components
    switch (iconName.toLowerCase()) {
      case 'shirt':
        return <Shirt className="w-5 h-5 text-white" />;
      case 'wind':
        return <Wind className="w-5 h-5 text-white" />;
      case 'scissors':
        return <Scissors className="w-5 h-5 text-white" />;
      case 'brush':
        return <Brush className="w-5 h-5 text-white" />;
      case 'package':
      case 'shoppingbag':
      default:
        return <ShoppingBag className="w-5 h-5 text-white" />;
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => {
      if (item.calculated_price) {
        return sum + item.calculated_price;
      }
      return sum + (item.price * item.quantity);
    }, 0);
  };

  // Check if serviceColor is a hex color
  const isHexColor = serviceColor.startsWith('#');

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div 
        className="px-6 py-4 flex items-center"
        style={isHexColor ? { backgroundColor: 'white' } : { backgroundColor: 'white' }}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
             style={isHexColor ? { backgroundColor: serviceColor } : { backgroundColor: serviceColor }}>
          {typeof serviceIcon === 'string' ? getIconComponent(serviceIcon) : serviceIcon}
        </div>
        <h2 className="text-xl font-bold" style={isHexColor ? { color: serviceColor } : { color: serviceColor }}>{serviceName}</h2>
      </div>

      <div className="p-6">
        <div className="space-y-6">
          {items.map((item) => (
            <CartItem
              key={item.id}
              id={item.id}
              name={item.name}
              price={item.price}
              quantity={item.quantity}
              description={item.description}
              image={item.image}
              serviceColor={serviceColor}
              isWishlisted={wishlistedItems.includes(item.id)}
              custom_input_value={item.custom_input_value}
              calculated_price={item.calculated_price}
              unit_label={item.unit_label}
              onQuantityChange={(change) => onQuantityChange(item.id, change)}
              onRemove={() => onRemoveItem(item.id)}
              onToggleWishlist={() => onToggleWishlist(item.id)}
            />
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              €{calculateSubtotal().toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCategory;