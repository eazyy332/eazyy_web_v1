import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Service, Category, Item } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface ServicesContextType {
  services: Service[];
  categories: Category[];
  items: Item[];
  loading: boolean;
  error: string | null;
  getServiceCategories: (serviceId: string) => Category[];
  getCategoryItems: (categoryId: string) => Item[];
  getServiceIdByIdentifier: (identifier: string) => string | undefined;
  getCategoryIdByName: (name: string) => string | undefined;
  getItemIdByName: (name: string) => string | undefined;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const ServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryCount = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    mounted.current = true;
    fetchInitialData();
    
    return () => {
      mounted.current = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      console.log('🔄 Fetching initial data...');
      setLoading(true);
      setError(null);

      const [
        { data: servicesData, error: servicesError },
        { data: categoriesData, error: categoriesError },
        { data: itemsData, error: itemsError }
      ] = await Promise.all([
        supabase.from('services').select('*').order('sequence'),
        supabase.from('categories').select('*').order('sequence'),
        supabase.from('items').select('*').order('sequence')
      ]);

      if (servicesError || categoriesError || itemsError) {
        throw new Error(servicesError?.message || categoriesError?.message || itemsError?.message);
      }

      if (mounted.current) {
        setServices(servicesData || []);
        setCategories(categoriesData || []);
        setItems((itemsData || []).filter(item => item.description && item.description.trim() !== ""));

        setupRealtimeSubscription();
      }
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        console.log(`Retrying... Attempt ${retryCount.current} of ${maxRetries}`);
        setTimeout(fetchInitialData, 1000 * retryCount.current);
      } else if (mounted.current) {
        setError('Failed to fetch data. Please refresh the page.');
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const setupRealtimeSubscription = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    channelRef.current = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'services'
        },
        async () => {
          const { data } = await supabase.from('services').select('*').order('sequence');
          if (mounted.current && data) setServices(data);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories'
        },
        async () => {
          const { data } = await supabase.from('categories').select('*').order('sequence');
          if (mounted.current && data) setCategories(data);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        async () => {
          const { data } = await supabase.from('items').select('*').order('sequence');
          if (mounted.current && data) setItems(data);
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });
  };

  const getServiceCategories = (serviceIdentifier: string): Category[] => {
    console.log('Getting categories for service:', serviceIdentifier);
    const service = services.find(s => s.service_identifier === serviceIdentifier);
    if (!service) return [];

    // Get all categories that have items assigned to this service
    const serviceItems = items.filter(item => {
      const itemCategories = categories.filter(cat => cat.id === item.category_id);
      return itemCategories.some(cat => {
        // Check if the category belongs to this service based on service_identifier
        const categoryService = services.find(s => 
          s.service_identifier === serviceIdentifier && 
          cat.service_id === s.id
        );
        return !!categoryService;
      });
    });

    const categoryIds = [...new Set(serviceItems.map(item => item.category_id))];
    const availableCategories = categories.filter(category => categoryIds.includes(category.id));
    
    console.log('Available categories:', availableCategories);
    return availableCategories;
  };

  const getCategoryItems = (categoryId: string): Item[] => {
    console.log('Getting items for category:', categoryId);
    const categoryItems = items.filter(item => 
      item.category_id === categoryId && 
      item.status === true
    ).sort((a, b) => a.sequence - b.sequence);
    
    console.log('Category items:', categoryItems);
    return categoryItems;
  };

  // New helper functions to get UUIDs by identifiers
  const getServiceIdByIdentifier = (identifier: string): string | undefined => {
    const service = services.find(s => s.service_identifier === identifier);
    return service?.id;
  };

  const getCategoryIdByName = (name: string): string | undefined => {
    const category = categories.find(c => c.name === name);
    return category?.id;
  };

  const getItemIdByName = (name: string): string | undefined => {
    const item = items.find(i => i.name === name);
    return item?.id;
  };

  const value = {
    services,
    categories,
    items,
    loading,
    error,
    getServiceCategories,
    getCategoryItems,
    getServiceIdByIdentifier,
    getCategoryIdByName,
    getItemIdByName
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (context === undefined) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};