import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Minus, ArrowLeft, ArrowRight, ShoppingBag, Info, Tag, Check, Star, Package, Shirt, Wind, Scissors, Brush } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useServices } from '../../../contexts/ServicesContext';
import { useCart } from '../../../components/cart/CartContext';

interface ServiceInfo {
  id: string;
  name: string;
  icon: any;
  color: string;
  lightColor: string;
  color_hex?: string;
  description: string;
  features: string[];
}

interface BaseItemSelectionProps {
  service: string;
  serviceInfo: ServiceInfo;
}

interface SelectedItem {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
  is_custom_quote?: boolean;
  custom_input_value?: number;
  calculated_price?: number;
  unit_label?: string;
  serviceId?: string;
  categoryId?: string;
  service_name?: string;
  category_name?: string;
}

const BaseItemSelection: React.FC<BaseItemSelectionProps> = ({
  service,
  serviceInfo
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { services, categories, items, getServiceCategories, getCategoryItems, getServiceIdByIdentifier } = useServices();
  const { addItem, isValidUUID } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: SelectedItem }>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [customInputValues, setCustomInputValues] = useState<{ [key: string]: number | string }>({});
  const [loading, setLoading] = useState(true);

  const availableCategories = getServiceCategories(service);

  useEffect(() => {
    // Wait for services and categories to load
    if (services.length > 0 && categories.length > 0 && items.length > 0) {
      setLoading(false);
    }
  }, [services, categories, items]);

  // Filter items based on active category
  const categoryFilteredItems = activeCategory 
    ? getCategoryItems(activeCategory)
    : availableCategories.flatMap(cat => getCategoryItems(cat.id));
  
  // Filter out items with facility_added = true and items without description
  const filteredItems = categoryFilteredItems.filter(item => {
    return item.description && 
           item.description.trim() !== '' && 
           item.facility_added !== true;
  });

  // Apply search filter
  const searchFilteredItems = filteredItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate totals
  const totalAmount = Object.values(selectedItems).reduce(
    (sum, item) => {
      if (item.calculated_price) {
        return sum + item.calculated_price;
      }
      return sum + ((item.price || 0) * item.quantity);
    },
    0
  );

  const totalItems = Object.values(selectedItems).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const handleQuantityChange = (item: any, change: number) => {
    if (item.is_custom_price) {
      navigate('/order/custom-quote', {
        state: {
          item,
          returnPath: location.pathname
        }
      });
      return;
    }

    setSelectedItems(prev => {
      const current = prev[item.id]?.quantity || 0;
      const newQuantity = Math.max(0, current + change);
      
      if (newQuantity === 0) {
        const { [item.id]: _, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: newQuantity,
          is_custom_quote: item.is_custom_price,
          serviceId: service,
          categoryId: item.category_id,
          service_name: serviceInfo.name,
          category_name: categories.find(c => c.id === item.category_id)?.name
        }
      };
    });
  };

  const handleCustomInputChange = (item: any, value: string) => {
    // Store the raw input value
    setCustomInputValues(prev => ({
      ...prev,
      [item.id]: value
    }));

    // Parse the input value
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    // Validate against min/max if provided
    if (item.min_input_value !== null && numValue < item.min_input_value) return;
    if (item.max_input_value !== null && numValue > item.max_input_value) return;

    // Calculate the price
    const calculatedPrice = numValue * (item.unit_price || 0);

    // Update the selected item
    setSelectedItems(prev => {
      return {
        ...prev,
        [item.id]: {
          id: item.id,
          name: item.name,
          price: item.unit_price || 0,
          quantity: 1,
          custom_input_value: numValue,
          calculated_price: calculatedPrice,
          unit_label: item.unit_label,
          serviceId: service,
          categoryId: item.category_id,
          service_name: serviceInfo.name,
          category_name: categories.find(c => c.id === item.category_id)?.name
        }
      };
    });
  };

  const handleAddToCart = () => {
    if (Object.keys(selectedItems).length === 0) {
      return; // Don't proceed if no items selected
    }
    
    // Get the actual service UUID
    const serviceId = getServiceIdByIdentifier(service);
    
    if (!serviceId || !isValidUUID(serviceId)) {
      console.error(`Invalid service identifier: ${service}`);
      return;
    }
    
    // Prepare cart data for this service
    const cartData = {
      id: serviceId,
      name: serviceInfo.name,
      icon: serviceInfo.icon.name || 'ShoppingBag',
      color: serviceInfo.color_hex || '#5078bb'
    };
    
    console.log('Adding items to cart with service:', serviceId);
    console.log('Selected items:', selectedItems);
    console.log('Cart data:', cartData);
    
    // Add each selected item to the cart
    Object.values(selectedItems).forEach(item => {
      const categoryId = item.categoryId;
      
      // Ensure we have valid UUIDs
      if (!isValidUUID(item.id)) {
        console.error(`Invalid item UUID: ${item.id}`);
        return;
      }
      
      if (!isValidUUID(categoryId)) {
        console.error(`Invalid category UUID: ${categoryId}`);
        return;
      }
      
      console.log('Adding item to cart:', {
        ...item,
        serviceId,
        categoryId,
        service_name: serviceInfo.name,
        category_name: categories.find(c => c.id === categoryId)?.name
      });
      
      addItem({
        ...item,
        serviceId,
        categoryId,
        service_name: serviceInfo.name,
        category_name: categories.find(c => c.id === categoryId)?.name
      }, cartData);
    });
    
    // Navigate to cart
    navigate('/cart');
  };

  // Helper function to generate background style from hex color
  const getBackgroundStyle = (hexColor: string) => {
    return { backgroundColor: hexColor };
  };

  // Helper function to generate light background style from hex color
  const getLightBackgroundStyle = (hexColor: string) => {
    return { backgroundColor: `${hexColor}20` }; // 20 is hex for 12% opacity
  };

  // Helper function to generate border style from hex color
  const getBorderStyle = (hexColor: string) => {
    return { borderColor: hexColor };
  };

  // Helper function to generate text color style from hex color
  const getTextStyle = (hexColor: string) => {
    return { color: hexColor };
  };

  // Get the appropriate color for the service
  const serviceColorHex = serviceInfo.color_hex || '#5078bb'; // Default to Regular Laundry blue

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen pt-24 pb-32 px-4 sm:px-6 lg:px-8"
      style={getLightBackgroundStyle(serviceColorHex)}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-6xl mx-auto"
      >
        {/* Service Header */}
        <motion.div 
          className="bg-white rounded-2xl p-6 mb-8 shadow-lg overflow-hidden relative"
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  style={getBackgroundStyle(serviceColorHex)}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transform transition-transform duration-200 hover:scale-110"
                >
                  <serviceInfo.icon size={32} className="text-white" />
                </div>
                <div className="ml-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {serviceInfo.name}
                  </h1>
                  <p className="text-gray-700 text-lg">
                    {serviceInfo.description}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={() => setShowInfo(!showInfo)}
                style={getBackgroundStyle(serviceColorHex)}
                className="p-3 rounded-xl text-white hover:opacity-90 transition-all duration-200"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Info className="w-6 h-6" />
              </motion.button>
            </div>
            
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-6 border-t border-gray-200"
                >
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Service Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {serviceInfo.features.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div 
                            style={getBackgroundStyle(serviceColorHex)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                          >
                            <Check className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
            <motion.button
              onClick={() => setActiveCategory(null)}
              style={!activeCategory ? getBackgroundStyle(serviceColorHex) : undefined}
              className={`flex-shrink-0 px-6 py-3 rounded-xl transition-all duration-200 ${
                !activeCategory 
                  ? 'text-white shadow-lg' 
                  : 'bg-white text-gray-900 hover:bg-gray-50 shadow'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              All Items
            </motion.button>
            {availableCategories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                style={activeCategory === category.id ? getBackgroundStyle(serviceColorHex) : undefined}
                className={`flex-shrink-0 px-6 py-3 rounded-xl transition-all duration-200 ${
                  activeCategory === category.id 
                    ? 'text-white shadow-lg' 
                    : 'bg-white text-gray-900 hover:bg-gray-50 shadow'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {category.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-12 pr-4 py-4 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-300 shadow-md"
              style={{
                borderColor: searchTerm ? serviceColorHex : undefined,
                boxShadow: searchTerm ? `0 0 0 1px ${serviceColorHex}20` : undefined
              }}
            />
          </div>
          {searchTerm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-500"
            >
              {searchFilteredItems.length} results
            </motion.div>
          )}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          <AnimatePresence mode="popLayout">
            {searchFilteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full text-center py-12"
              >
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                <p className="text-gray-600">Try adjusting your search or filters</p>
              </motion.div>
            ) : (
              searchFilteredItems.map((item) => {
                // Get the icon based on the category
                const categoryName = categories.find(c => c.id === item.category_id)?.name || '';
                let ItemIcon: React.ElementType = ShoppingBag;
                
                if (categoryName.includes('Top') || categoryName.includes('Shirt')) {
                  ItemIcon = Shirt;
                } else if (categoryName.includes('Clean')) {
                  ItemIcon = Wind;
                } else if (categoryName.includes('Repair')) {
                  ItemIcon = Scissors;
                } else if (categoryName.includes('Special')) {
                  ItemIcon = Brush;
                } else if (categoryName.includes('Mix') || categoryName.includes('Bag')) {
                  ItemIcon = Package;
                }
                
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${
                      item.is_popular ? `border-l-4` : 'border border-gray-100'
                    }`}
                    style={item.is_popular ? { borderLeftColor: serviceColorHex } : undefined}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div 
                            className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center"
                            style={{ backgroundColor: `${serviceColorHex}15` }}
                          >
                            <ItemIcon 
                              className="w-7 h-7" 
                              style={{ color: serviceColorHex }}
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                            {item.is_popular && (
                              <div 
                                style={getLightBackgroundStyle(serviceColorHex)}
                                className="mt-1 px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center"
                              >
                                <Star className="w-3 h-3 mr-1 fill-current" style={{ color: serviceColorHex }} />
                                <span style={{ color: serviceColorHex }}>Popular</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-3 ml-15">{item.description}</p>
                        
                        {item.custom_pricing ? (
                          <div className="space-y-3 mt-3 ml-15">
                            <div className="flex items-center">
                              <Tag className="w-4 h-4 mr-2" style={{ color: serviceColorHex }} />
                              <span className="text-lg font-semibold text-gray-900">
                                €{item.unit_price?.toFixed(2)}/{item.unit_label}
                              </span>
                            </div>
                            
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center">
                                <input
                                  type="number"
                                  value={customInputValues[item.id] || ''}
                                  onChange={(e) => handleCustomInputChange(item, e.target.value)}
                                  placeholder={item.input_placeholder || `Enter ${item.unit_label}`}
                                  min={item.min_input_value || 0.1}
                                  max={item.max_input_value || 100}
                                  step="0.1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-opacity-50"
                                  style={{
                                    borderColor: customInputValues[item.id] ? serviceColorHex : undefined,
                                    boxShadow: customInputValues[item.id] ? `0 0 0 1px ${serviceColorHex}40` : undefined
                                  }}
                                />
                              </div>
                              
                              {selectedItems[item.id] && (
                                <div className="text-sm font-medium" style={{ color: serviceColorHex }}>
                                  Total: €{selectedItems[item.id].calculated_price?.toFixed(2) || '0.00'}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center ml-15">
                            <Tag className="w-4 h-4 mr-2" style={{ color: serviceColorHex }}/>
                            {item.price !== null ? (
                              <span className="text-lg font-semibold text-gray-900">
                                €{item.price.toFixed(2)}
                              </span>
                            ) : (
                              <span className="font-medium" style={{ color: serviceColorHex }}>
                                Custom Price
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3 ml-4">
                        {!item.custom_pricing && item.price !== null ? (
                          <>
                            <motion.button
                              onClick={() => handleQuantityChange(item, -1)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                                selectedItems[item.id]
                                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              }`}
                              whileHover={selectedItems[item.id] ? { scale: 1.1 } : {}}
                              whileTap={selectedItems[item.id] ? { scale: 0.9 } : {}}
                              disabled={!selectedItems[item.id]}
                            >
                              <Minus className="w-4 h-4" />
                            </motion.button>
                            
                            <div className="w-8 text-center">
                              <span className="font-semibold text-gray-900">
                                {selectedItems[item.id]?.quantity || 0}
                              </span>
                            </div>
                            
                            <motion.button
                              onClick={() => handleQuantityChange(item, 1)}
                              style={getBackgroundStyle(serviceColorHex)}
                              className="w-9 h-9 rounded-full text-white flex items-center justify-center shadow-md hover:shadow-lg"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                            >
                              <Plus className="w-4 h-4" />
                            </motion.button>
                          </>
                        ) : item.price === null && !item.custom_pricing ? (
                          <motion.button
                            onClick={() => handleQuantityChange(item, 1)}
                            style={getBackgroundStyle(serviceColorHex)}
                            className="px-4 py-2 text-white rounded-xl text-sm font-medium shadow-md hover:shadow-lg"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Request Quote
                          </motion.button>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* Fixed Bottom Bar */}
        <motion.div 
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Back Button - Hidden on Mobile */}
              <motion.button
                onClick={() => navigate('/order/service')}
                className="hidden sm:flex items-center px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors"
                whileHover={{ x: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </motion.button>

              {/* Mobile Price and Items Count */}
              <div className="w-full sm:w-auto flex items-center justify-between sm:hidden bg-gray-50 p-3 rounded-xl">
                <div className="flex items-center">
                  <ShoppingBag className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-gray-600">{totalItems} items</span>
                </div>
                <span className="font-bold text-gray-900">€{totalAmount.toFixed(2)}</span>
              </div>

              {/* Desktop Price */}
              <div className="hidden sm:block">
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">€{totalAmount.toFixed(2)}</p>
              </div>

              {/* Continue Button */}
              <motion.button
                onClick={handleAddToCart}
                style={getBackgroundStyle(serviceColorHex)}
                className={`w-full sm:w-auto flex items-center justify-center px-8 py-4 rounded-xl font-medium transition-all duration-300 ${
                  Object.keys(selectedItems).length > 0
                    ? 'text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                whileHover={Object.keys(selectedItems).length > 0 ? { scale: 1.05 } : {}}
                whileTap={Object.keys(selectedItems).length > 0 ? { scale: 0.95 } : {}}
                disabled={Object.keys(selectedItems).length === 0}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                <span>Add to Cart</span>
                <span className="ml-2">({totalItems})</span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default BaseItemSelection;