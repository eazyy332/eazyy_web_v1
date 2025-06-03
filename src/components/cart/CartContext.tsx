import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  serviceId: string;
  categoryId: string;
  description?: string;
  image?: string;
  custom_input_value?: number;
  calculated_price?: number;
  unit_label?: string;
  service_name?: string;
  category_name?: string;
}

interface CartItemsByService {
  [serviceId: string]: {
    service: {
      id: string;
      name: string;
      icon: string;
      color: string;
    };
    items: CartItem[];
  };
}

interface CartContextType {
  cart: CartItemsByService;
  addItem: (item: CartItem, service: { id: string; name: string; icon: string; color: string }) => void;
  removeItem: (serviceId: string, itemId: string) => void;
  updateQuantity: (serviceId: string, itemId: string, quantity: number) => void;
  clearCart: () => void;
  wishlistedItems: string[];
  toggleWishlist: (itemId: string) => void;
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
  isValidUUID: (id: string) => boolean;
  upgradeCart: (cart: any) => CartItemsByService;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItemsByService>({});
  const [wishlistedItems, setWishlistedItems] = useState<string[]>([]);
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedWishlist = localStorage.getItem('wishlist');
    
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Validate and upgrade cart if needed
        const validatedCart = upgradeCart(parsedCart);
        setCart(validatedCart);
      } catch (error) {
        console.error('Failed to parse cart from localStorage:', error);
      }
    }
    
    if (savedWishlist) {
      try {
        setWishlistedItems(JSON.parse(savedWishlist));
      } catch (error) {
        console.error('Failed to parse wishlist from localStorage:', error);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);
  
  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlistedItems));
  }, [wishlistedItems]);

  // UUID validation function
  const isValidUUID = (id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Function to upgrade cart data to ensure all IDs are valid UUIDs
  const upgradeCart = (oldCart: any): CartItemsByService => {
    const upgradedCart: CartItemsByService = {};
    
    // If the cart is empty or invalid, return an empty cart
    if (!oldCart || typeof oldCart !== 'object') {
      return {};
    }
    
    for (const serviceId in oldCart) {
      // Skip invalid service IDs
      if (!isValidUUID(serviceId)) {
        console.warn(`Skipping invalid service ID: ${serviceId}`);
        continue;
      }
      
      const serviceData = oldCart[serviceId];
      if (!serviceData || !serviceData.service || !Array.isArray(serviceData.items)) {
        console.warn(`Invalid service data for service ID: ${serviceId}`);
        continue;
      }
      
      // Filter out items with invalid IDs
      const validItems = serviceData.items.filter(item => {
        if (!item || !isValidUUID(item.id)) {
          console.warn(`Skipping invalid item ID in service ${serviceId}`);
          return false;
        }
        
        // Ensure categoryId is a valid UUID
        if (!isValidUUID(item.categoryId)) {
          console.warn(`Invalid categoryId for item ${item.id} in service ${serviceId}`);
          return false;
        }
        
        return true;
      });
      
      if (validItems.length > 0) {
        upgradedCart[serviceId] = {
          service: serviceData.service,
          items: validItems
        };
      }
    }
    
    return upgradedCart;
  };

  const addItem = (item: CartItem, service: { id: string; name: string; icon: string; color: string }) => {
    // Validate UUIDs
    if (!isValidUUID(item.id)) {
      console.warn(`Invalid item UUID: ${item.id}`);
      return;
    }
    
    if (!isValidUUID(service.id)) {
      console.warn(`Invalid service UUID: ${service.id}`);
      return;
    }
    
    if (!isValidUUID(item.categoryId)) {
      console.warn(`Invalid category UUID: ${item.categoryId}`);
      return;
    }
    
    console.log('Adding item to cart:', item);
    console.log('Service info:', service);
    
    setCart(prevCart => {
      // Check if service exists in cart
      if (prevCart[service.id]) {
        // Check if item exists in service
        const existingItemIndex = prevCart[service.id].items.findIndex(i => i.id === item.id);
        
        if (existingItemIndex >= 0) {
          // Update existing item quantity
          const updatedItems = [...prevCart[service.id].items];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + item.quantity
          };
          
          return {
            ...prevCart,
            [service.id]: {
              ...prevCart[service.id],
              items: updatedItems
            }
          };
        } else {
          // Add new item to existing service
          return {
            ...prevCart,
            [service.id]: {
              ...prevCart[service.id],
              items: [...prevCart[service.id].items, item]
            }
          };
        }
      } else {
        // Add new service with item
        return {
          ...prevCart,
          [service.id]: {
            service,
            items: [item]
          }
        };
      }
    });
  };

  const removeItem = (serviceId: string, itemId: string) => {
    setCart(prev => {
      const service = prev[serviceId];
      if (!service) return prev;

      const updatedItems = service.items.filter(item => item.id !== itemId);

      // If no items left in this service, remove the service
      if (updatedItems.length === 0) {
        const { [serviceId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [serviceId]: {
          ...service,
          items: updatedItems
        }
      };
    });
  };

  const updateQuantity = (serviceId: string, itemId: string, change: number) => {
    setCart(prevCart => {
      const service = prevCart[serviceId];
      if (!service) return prevCart;

      const itemIndex = service.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return prevCart;

      const currentItem = service.items[itemIndex];
      const newQuantity = currentItem.quantity + change;

      if (newQuantity <= 0) {
        // Remove item if quantity becomes zero or negative
        const updatedItems = service.items.filter(item => item.id !== itemId);
        
        // If no items left in this service, remove the service
        if (updatedItems.length === 0) {
          const { [serviceId]: _, ...restCart } = prevCart;
          return restCart;
        }
        
        return {
          ...prevCart,
          [serviceId]: {
            ...service,
            items: updatedItems
          }
        };
      }

      // Update quantity
      const updatedItems = [...service.items];
      updatedItems[itemIndex] = {
        ...currentItem,
        quantity: newQuantity
      };

      return {
        ...prevCart,
        [serviceId]: {
          ...service,
          items: updatedItems
        }
      };
    });
  };

  const clearCart = () => {
    setCart({});
    localStorage.removeItem('cart');
  };

  const toggleWishlist = (itemId: string) => {
    setWishlistedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalItems = 0;
    let subtotal = 0;
    
    Object.values(cart).forEach(service => {
      service.items.forEach(item => {
        totalItems += item.quantity;
        if (item.calculated_price) {
          subtotal += item.calculated_price;
        } else {
          subtotal += item.price * item.quantity;
        }
      });
    });
    
    const tax = subtotal * 0.21; // 21% VAT
    const total = subtotal + tax;
    
    return { totalItems, subtotal, tax, total };
  };

  const { totalItems, subtotal, tax, total } = calculateTotals();

  const value = {
    cart,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    wishlistedItems,
    toggleWishlist,
    totalItems,
    subtotal,
    tax,
    total,
    isValidUUID,
    upgradeCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};