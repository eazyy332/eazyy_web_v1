import { supabase } from './lib/supabase';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  service_id?: string;
  category_id?: string;
  service_name?: string;
  category_name?: string;
  is_facility_added?: boolean;
}

export async function addFacilityItem(orderItem: Omit<OrderItem, 'id' | 'subtotal'>) {
  try {
    // Calculate subtotal
    const subtotal = orderItem.unit_price * orderItem.quantity;
    
    // Set is_facility_added to true
    const itemWithSubtotal = {
      ...orderItem,
      subtotal,
      is_facility_added: true
    };
    
    const { data, error } = await supabase
      .from('order_items')
      .insert(itemWithSubtotal)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding facility item:', error);
    throw error;
  }
}

export async function updateOrderItem(id: string, updates: Partial<OrderItem>) {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating order item:', error);
    throw error;
  }
}

export async function getOrderItems(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching order items:', error);
    throw error;
  }
}