import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  custom_input_value?: number;
  calculated_price?: number;
  unit_label?: string;
  service_id?: string;
  category_id?: string;
  service_name?: string;
  category_name?: string;
}

interface OrderRequest {
  customer_name: string;
  email: string;
  phone?: string;
  shipping_address: string;
  shipping_method: string;
  special_instructions?: string;
  pickup_date: string;
  delivery_date?: string;
  type: 'pickup' | 'delivery';
  order_type: 'standard' | 'custom_quote';
  items: OrderItem[];
  latitude: string;
  longitude: string;
  estimated_pickup_time?: string;
  estimated_dropoff_time?: string;
  service_id?: string;
  category_id?: string;
}

export async function createOrder(orderData: OrderRequest) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('You must be logged in to create an order');
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create order');
    }

    return await response.json();
  } catch (error) {
    console.error('Order creation error:', error);
    throw error;
  }
}

export async function getOrderById(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
}

export async function getOrderByNumber(orderNumber: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .eq('order_number', orderNumber)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
}

export async function getUserOrders() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

export async function confirmItemDiscrepancy(orderId: string, decision: 'accepted' | 'declined') {
  try {
    console.log(`Confirming item discrepancy for order ${orderId} with decision: ${decision}`);
    
    // First, get the current order to verify its status
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('status, facility_updated_items')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      throw orderError;
    }
    
    if (!orderData) {
      console.error('Order not found');
      throw new Error('Order not found');
    }
    
    if (orderData.status !== 'pending_item_confirmation') {
      console.error('Order is not awaiting item confirmation:', orderData.status);
      throw new Error('Order is no longer awaiting item confirmation');
    }

    // If accepting the changes, we need to update the order items
    if (decision === 'accepted') {
      // Get existing discrepancy items
      const { data: discrepancyItems, error: discrepancyError } = await supabase
        .from('discrepancy_items')
        .select(`
          *,
          original_order_item:original_order_item_id (
            product_id,
            service_id,
            service_name,
            category_id,
            category_name
          )
        `)
        .eq('order_id', orderId);
        
      if (discrepancyError) {
        console.error('Error fetching discrepancy items:', discrepancyError);
        throw discrepancyError;
      }
      
      console.log('Existing discrepancy items:', discrepancyItems);
      
      // If there are discrepancy items, add them to the order
      if (discrepancyItems && discrepancyItems.length > 0) {
        // First, mark any temporary items as non-temporary
        for (const item of discrepancyItems) {
          if (item.is_temporary) {
            const { error: updateError } = await supabase
              .from('discrepancy_items')
              .update({ is_temporary: false })
              .eq('id', item.id);
              
            if (updateError) {
              console.error('Error updating discrepancy item:', updateError);
              throw updateError;
            }
          }
          
          // Add the discrepancy item to order_items if it doesn't exist
          const { data: existingItem, error: existingItemError } = await supabase
            .from('order_items')
            .select('id')
            .eq('order_id', orderId)
            .eq('product_name', item.product_name)
            .maybeSingle();
            
          if (existingItemError) {
            console.error('Error checking existing item:', existingItemError);
            throw existingItemError;
          }
          
          if (!existingItem) {
            // Determine the correct product_id to use
            let productId = null;
            
            // First try to use product_id from the discrepancy item
            if (item.product_id) {
              // Verify the product_id exists in the items table
              const { data: productExists } = await supabase
                .from('items')
                .select('id')
                .eq('id', item.product_id)
                .maybeSingle();
                
              if (productExists) {
                productId = item.product_id;
              } else {
                console.warn(`Product ID ${item.product_id} not found in items table`);
              }
            }
            
            // If no valid product_id from discrepancy item, try from original order item
            if (!productId && item.original_order_item && item.original_order_item.product_id) {
              // Verify the product_id exists in the items table
              const { data: productExists } = await supabase
                .from('items')
                .select('id')
                .eq('id', item.original_order_item.product_id)
                .maybeSingle();
                
              if (productExists) {
                productId = item.original_order_item.product_id;
              } else {
                console.warn(`Product ID ${item.original_order_item.product_id} from original order item not found in items table`);
              }
            }
            
            // If we still don't have a valid product_id, skip this item
            if (!productId) {
              console.error(`No valid product_id found for discrepancy item ${item.id}, skipping`);
              continue;
            }
            
            // Create a new order item from the discrepancy item
            const { error: insertError } = await supabase
              .from('order_items')
              .insert({
                order_id: orderId,
                product_id: productId,
                product_name: item.product_name,
                quantity: item.actual_quantity,
                unit_price: item.unit_price || 0,
                subtotal: (item.unit_price || 0) * item.actual_quantity,
                service_type: item.service_type,
                category_name: item.category_name || (item.original_order_item ? item.original_order_item.category_name : null),
                service_name: item.service_name || (item.original_order_item ? item.original_order_item.service_name : null),
                service_id: item.service_id || (item.original_order_item ? item.original_order_item.service_id : null),
                category_id: item.category_id || (item.original_order_item ? item.original_order_item.category_id : null),
                is_facility_added: true // Set this to true for items added by facility
              });
              
            if (insertError) {
              console.error('Error inserting order item:', insertError);
              console.error('Failed item data:', {
                order_id: orderId,
                product_id: productId,
                product_name: item.product_name,
                quantity: item.actual_quantity,
                unit_price: item.unit_price || 0,
                service_id: item.service_id || (item.original_order_item ? item.original_order_item.service_id : null),
                category_id: item.category_id || (item.original_order_item ? item.original_order_item.category_id : null)
              });
              throw insertError;
            }
          } else {
            // Update the existing order item
            const { error: updateError } = await supabase
              .from('order_items')
              .update({
                quantity: item.actual_quantity,
                subtotal: (item.unit_price || 0) * item.actual_quantity
              })
              .eq('id', existingItem.id);
              
            if (updateError) {
              console.error('Error updating order item:', updateError);
              throw updateError;
            }
          }
        }
      }
    }

    // Update the order with the customer's decision
    // For 'accepted', move to 'processing'
    // For 'declined', keep in 'pending_item_confirmation' but update discrepancy_status
    const updateData = decision === 'accepted' 
      ? { 
          customer_item_decision: decision,
          status: 'processing'
        }
      : {
          customer_item_decision: decision,
          status: 'processing'
          // Process the order even when declining - this is what the client wants
        };

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating order decision:', error);
      throw error;
    }

    console.log('Order updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error confirming item discrepancy:', error);
    throw error;
  }
}