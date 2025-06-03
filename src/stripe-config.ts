// This file contains the configuration for Stripe products
// Each product must include priceId, name, description, and mode properties

export const stripeProducts = {
  shirtDryCleaning: {
    priceId: 'price_1RFIMCGjEEP5GQRtuQzCKjHm',
    name: 'Shirt Dry Cleaning',
    description: 'Professional dry cleaning service for shirts',
    mode: 'payment'
  }
};

// Function to get all products
export const getAllProducts = () => {
  return Object.values(stripeProducts);
};

// Function to get a product by ID
export const getProductById = (id: keyof typeof stripeProducts) => {
  return stripeProducts[id];
};