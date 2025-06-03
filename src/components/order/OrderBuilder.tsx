import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus, Minus, ArrowLeft, ArrowRight, ShoppingBag, Info, Tag, Check, Star, Package, Shirt, Wind, Scissors, Brush } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useServices } from '../../contexts/ServicesContext';
import { useCart } from '../cart/CartContext';

interface SelectedItem {
  id: string;
  name: string;
  price: number | null;
  quantity: number;
  is_custom_quote?: boolean;
  custom_input_value?: number;
  calculated_price?: number;
  unit_label?: string;
  serviceId: string;
  categoryId: string;
  confirmed?: boolean;
  service_name?: string;
  category_name?: string;
}

interface ServiceTab {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  color_hex: string;
  itemCount: number;
  description: string;
}

const OrderBuilder: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { services, categories, items, getServiceCategories, getCategoryItems, getServiceIdByIdentifier } = useServices();
  const { addItem, isValidUUID } = useCart();
  
  const [activeService, setActiveService] = useState<string>('wash-iron'); // Default to Wash & Iron
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: SelectedItem }>({});
  const [showInfo, setShowInfo] = useState(false);
  const [customInputValues, setCustomInputValues] = useState<{ [key: string]: number | string }>({});
  const [loading, setLoading] = useState(true);

  // Initialize with default service if none is active
  useEffect(() => {
    if (services.length > 0 && !services.find(s => s.service_identifier === activeService)) {
      setActiveService(services[0].service_identifier);
    }
    
    if (services.length > 0 && categories.length > 0 && items.length > 0) {
      setLoading(false);
    }
  }, [services, activeService, categories, items]);

  // Reset active category when changing service
  useEffect(() => {
    setActiveCategory(null);
  }, [activeService]);

  // Get current service info
  const currentService = services.find(s => s.service_identifier === activeService);
  
  // Get icon component based on service identifier
  const getServiceIcon = (identifier: string): React.ElementType => {
    switch (identifier) {
      case 'easy-bag': return Package;
      case 'wash-iron': return Shirt;
      case 'dry-cleaning': return Wind;
      case 'repairs': return Scissors;
      case 'special-care': return Brush;
      default: return Package;
    }
  };

  // Prepare service tabs
  const serviceTabs: ServiceTab[] = services.map(service => {
    // Count items selected for this service
    const itemCount = Object.values(selectedItems).filter(
      item => item.serviceId === service.service_identifier && 
      // Only count confirmed items for custom pricing items
      (!item.custom_input_value || item.confirmed)
    ).reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: service.service_identifier,
      name: service.name,
      icon: getServiceIcon(service.service_identifier),
      color: service.color_scheme?.primary || 'bg-blue-600',
      color_hex: service.color_hex || '#5078bb',
      itemCount,
      description: service.short_description || ''
    };
  });

  // Get available categories for current service
  const availableCategories = getServiceCategories(activeService);

  // Filter items based on active category and search term
  const filteredItems = activeCategory 
    ? getCategoryItems(activeCategory)
    : availableCategories.flatMap(cat => getCategoryItems(cat.id));

  const searchFilteredItems = filteredItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals for current service
  const serviceItems = Object.values(selectedItems).filter(
    item => item.serviceId === activeService && 
    // Only count confirmed items for custom pricing items
    (!item.custom_input_value || item.confirmed)
  );

  const serviceTotal = serviceItems.reduce(
    (sum, item) => {
      if (item.calculated_price) {
        return sum + item.calculated_price;
      }
      return sum + ((item.price || 0) * item.quantity);
    },
    0
  );

  const serviceItemCount = serviceItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  // Calculate overall totals
  const totalAmount = Object.values(selectedItems).reduce(
    (sum, item) => {
      // Only count confirmed items for custom pricing items
      if (!item.custom_input_value || item.confirmed) {
        if (item.calculated_price) {
          return sum + item.calculated_price;
        }
        return sum + ((item.price || 0) * item.quantity);
      }
      return sum;
    },
    0
  );

  const totalItems = Object.values(selectedItems).reduce(
    (sum, item) => {
      // Only count confirmed items for custom pricing items
      if (!item.custom_input_value || item.confirmed) {
        return sum + item.quantity;
      }
      return sum;
    },
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
      const itemKey = item.id;
      const current = prev[itemKey]?.quantity || 0;
      const newQuantity = Math.max(0, current + change);
      
      if (newQuantity === 0) {
        const { [itemKey]: _, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [itemKey]: {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: newQuantity,
          is_custom_quote: item.is_custom_price,
          serviceId: activeService,
          categoryId: item.category_id,
          service_name: currentService?.name,
          category_name: categories.find(cat => cat.id === item.category_id)?.name
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

    // Update the selected item - but mark as unconfirmed
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
          serviceId: activeService,
          categoryId: item.category_id,
          service_name: currentService?.name,
          category_name: categories.find(cat => cat.id === item.category_id)?.name,
          confirmed: false // Set to false until confirmed
        }
      };
    });
  };

  const handleConfirmCustomInput = (item: any) => {
    // Only proceed if there's a valid input value
    if (selectedItems[item.id] && selectedItems[item.id].custom_input_value) {
      // Mark the item as confirmed
      setSelectedItems(prev => ({
        ...prev,
        [item.id]: {
          ...prev[item.id],
          confirmed: true
        }
      }));
    }
  };

  const handleAddToCart = () => {
    // Filter out unconfirmed custom items
    const confirmedItems = Object.values(selectedItems).filter(item => 
      !item.custom_input_value || item.confirmed
    );
    
    if (confirmedItems.length === 0) {
      return; // Don't proceed if no confirmed items
    }
    
    // Group items by service
    confirmedItems.forEach(item => {
      const serviceIdentifier = item.serviceId;
      const service = services.find(s => s.service_identifier === serviceIdentifier);
      
      if (service) {
        // Get the actual service UUID
        const serviceId = getServiceIdByIdentifier(serviceIdentifier);
        
        if (!serviceId || !isValidUUID(serviceId)) {
          console.error(`Invalid service identifier: ${serviceIdentifier}`);
          return;
        }
        
        console.log('Adding item to cart with service ID:', serviceId);
        
        // Add item to cart
        addItem({
          id: item.id,
          name: item.name,
          price: item.price || 0,
          quantity: item.quantity,
          custom_input_value: item.custom_input_value,
          calculated_price: item.calculated_price,
          unit_label: item.unit_label,
          serviceId: serviceId,
          categoryId: item.categoryId,
          service_name: service.name,
          category_name: item.category_name
        }, {
          id: serviceId,
          name: service.name,
          icon: getServiceIcon(serviceIdentifier).name || 'ShoppingBag',
          color: service.color_hex || '#5078bb'
        });
      }
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
    return { backgroundColor: `${hexColor}10` }; // 10 is hex for 6% opacity
  };

  // Helper function to generate border style from hex color
  const getBorderStyle = (hexColor: string) => {
    return { borderColor: hexColor };
  };

  // Helper function to generate text color style from hex color
  const getTextStyle = (hexColor: string) => {
    return { color: hexColor };
  };

  // Get the appropriate color for the active service
  const activeServiceTab = serviceTabs.find(tab => tab.id === activeService);
  const serviceColorHex = activeServiceTab?.color_hex || '#5078bb';

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
    <div className="min-h-screen pt-20 pb-32 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-6xl mx-auto"
      >
        {/* Order Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-md mx-auto">
            {["Select Service", "Add Items", "Checkout"].map((label, index) => {
              const stepNumber = index + 1;
              const isActive = (totalItems > 0 ? 2 : 1) >= stepNumber;
              return (
                <div key={stepNumber} className="flex-1 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                  >
                    {stepNumber}
                  </div>
                  <p className="mt-2 text-xs text-center whitespace-nowrap">{label}</p>
                  {stepNumber < 3 && (
                    <div className={`w-full h-0.5 mt-2 ${ (totalItems > 0 ? 2 : 1) > stepNumber ? 'bg-blue-600' : 'bg-gray-200' }`}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {/* Service Tabs */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Select Service</h1>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {serviceTabs.map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => setActiveService(tab.id)}
                className={`relative flex items-center justify-start p-4 rounded-xl transition-all duration-200 ${
                  tab.id === activeService 
                    ? 'bg-white shadow-md border-2' 
                    : 'bg-white shadow-sm border border-gray-100'
                }`}
                style={tab.id === activeService ? 
                  { borderColor: tab.color_hex, borderWidth: '2px' } : 
                  { borderColor: '#f3f4f6', borderWidth: '1px' }
                }
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
                  style={{ color: tab.color_hex }}
                >
                  <tab.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 text-sm">{tab.name}</h3>
                </div>
                {tab.itemCount > 0 && (
                  <span className="absolute top-1 right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.itemCount}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
          
          {/* Service Description */}
          <AnimatePresence>
            {activeServiceTab && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <p className="text-gray-600 text-sm">{activeServiceTab.description}</p>
                <p className="text-xs text-gray-500 mt-2">Switch services anytime to add items from multiple services.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
            <span className="text-sm text-gray-500">{filteredItems.length} items available</span>
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            <motion.button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 ${
                !activeCategory 
                  ? 'text-white shadow-sm' 
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-100'
              }`}
              style={!activeCategory ? getBackgroundStyle(serviceColorHex) : undefined}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              All Items
            </motion.button>
            {availableCategories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 ${
                  activeCategory === category.id 
                    ? 'text-white shadow-sm' 
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-100'
                }`}
                style={activeCategory === category.id ? getBackgroundStyle(serviceColorHex) : undefined}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {category.name}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-300 shadow-sm"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24">
          <AnimatePresence mode="popLayout">
            {searchFilteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="col-span-full text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100"
              >
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
                    key={`${activeService}-${item.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`bg-white rounded-xl p-5 shadow-sm hover:shadow transition-all duration-300 border ${
                      item.is_popular ? `border-l-4` : 'border-gray-100'
                    }`}
                    style={item.is_popular ? { borderLeftColor: serviceColorHex } : undefined}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div 
                            className="w-10 h-10 rounded-lg mr-3 flex items-center justify-center"
                            style={{ backgroundColor: `${serviceColorHex}15` }}
                          >
                            <ItemIcon 
                              className="w-6 h-6" 
                              style={{ color: serviceColorHex }}
                            />
                          </div>
                          <div>
                            <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
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
                        {item.description && (
                          <p className="text-gray-600 text-xs mb-2 ml-13">{item.description}</p>
                        )}
                        
                        {item.custom_pricing ? (
                          <div className="space-y-2 mt-2 ml-13">
                            <div className="flex items-center">
                              <Tag className="w-4 h-4 mr-1" style={{ color: serviceColorHex }} />
                              <span className="text-sm font-semibold text-gray-900">
                                €{item.unit_price?.toFixed(2)}/{item.unit_label}
                              </span>
                            </div>
                            
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="number"
                                  value={customInputValues[item.id] || ''}
                                  onChange={(e) => handleCustomInputChange(item, e.target.value)}
                                  placeholder={item.input_placeholder || `Enter ${item.unit_label}`}
                                  min={item.min_input_value || 0.1}
                                  max={item.max_input_value || 100}
                                  step="0.1"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring focus:ring-opacity-50 text-sm"
                                  style={{
                                    borderColor: customInputValues[item.id] ? serviceColorHex : undefined,
                                    boxShadow: customInputValues[item.id] ? `0 0 0 1px ${serviceColorHex}40` : undefined
                                  }}
                                />
                                <motion.button
                                  onClick={() => handleConfirmCustomInput(item)}
                                  style={getBackgroundStyle(serviceColorHex)}
                                  className="px-3 py-2 text-white rounded-lg flex-shrink-0 text-sm"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  disabled={!customInputValues[item.id]}
                                >
                                  Confirm
                                </motion.button>
                              </div>
                              
                              {selectedItems[item.id] && (
                                <div className="text-sm font-medium" style={{ color: serviceColorHex }}>
                                  Total: €{selectedItems[item.id].calculated_price?.toFixed(2) || '0.00'}
                                  {selectedItems[item.id].confirmed && (
                                    <span className="ml-2 text-green-600">✓ Confirmed</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center mt-1 ml-13">
                            <Tag className="w-4 h-4 mr-1" style={{ color: serviceColorHex }}/>
                            {item.price !== null ? (
                              <span className="text-base font-semibold text-gray-900">
                                €{item.price.toFixed(2)}
                              </span>
                            ) : (
                              <span className="font-medium text-sm" style={{ color: serviceColorHex }}>
                                Custom Price
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-3">
                        {!item.custom_pricing && item.price !== null ? (
                          <>
                            <motion.button
                              onClick={() => handleQuantityChange(item, -1)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
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
                            
                            <div className="w-6 text-center">
                              <span className="font-semibold text-gray-900 text-sm">
                                {selectedItems[item.id]?.quantity || 0}
                              </span>
                            </div>
                            
                            <motion.button
                              onClick={() => handleQuantityChange(item, 1)}
                              style={getBackgroundStyle(serviceColorHex)}
                              className="w-8 h-8 rounded-full text-white flex items-center justify-center shadow-sm"
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
                            className="px-3 py-2 text-white rounded-lg text-xs font-medium shadow-sm"
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
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <motion.button
                  onClick={() => navigate('/')}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  whileHover={{ x: -3 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  <span className="hidden sm:inline">Back</span>
                </motion.button>
                
                <div className="ml-4 sm:ml-8">
                  <p className="text-xs text-gray-500">Total Amount</p>
                  <p className="text-xl font-bold text-gray-900">€{totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {/* Continue Button */}
              <motion.button
                onClick={handleAddToCart}
                style={getBackgroundStyle(serviceColorHex)}
                className="flex items-center justify-center px-6 py-3 rounded-xl font-medium transition-all duration-300 text-white shadow-md"
                whileHover={totalItems > 0 ? { scale: 1.02 } : {}}
                whileTap={totalItems > 0 ? { scale: 0.98 } : {}}
                disabled={totalItems === 0}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Add to Cart
                {totalItems > 0 && (
                  <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                    {totalItems}
                  </span>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default OrderBuilder;