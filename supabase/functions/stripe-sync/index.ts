import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import Stripe from "npm:stripe@14.18.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Stripe with your secret key
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method === "POST") {
      // Sync all items from database to Stripe
      return await handleSync(req);
    } else if (req.method === "GET") {
      // Get all products from Stripe
      return await handleGetProducts();
    } else {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleSync(req: Request) {
  // Get all active items from the database
  const { data: items, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .eq("status", true);

  if (itemsError) {
    throw new Error(`Error fetching items: ${itemsError.message}`);
  }

  // Get all active categories
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("status", true);

  if (categoriesError) {
    throw new Error(`Error fetching categories: ${categoriesError.message}`);
  }

  // Create a map of category IDs to names
  const categoryMap = new Map();
  categories.forEach((category) => {
    categoryMap.set(category.id, category.name);
  });

  // Get all existing Stripe products
  const existingProducts = await stripe.products.list({ limit: 100, active: true });
  const existingProductMap = new Map();
  existingProducts.data.forEach((product) => {
    existingProductMap.set(product.metadata.item_id, product);
  });

  // Process each item
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        const categoryName = categoryMap.get(item.category_id) || "Uncategorized";
        const existingProduct = existingProductMap.get(item.id);

        // If the product exists in Stripe, update it
        if (existingProduct) {
          // Check if we need to update the product
          const needsUpdate =
            existingProduct.name !== item.name ||
            existingProduct.description !== item.description ||
            existingProduct.metadata.category !== categoryName;

          if (needsUpdate) {
            const updatedProduct = await stripe.products.update(existingProduct.id, {
              name: item.name,
              description: item.description || "",
              metadata: {
                item_id: item.id,
                category: categoryName,
                custom_pricing: item.custom_pricing ? "true" : "false",
              },
            });

            // Update price if needed
            if (item.price && !item.custom_pricing) {
              // Get existing prices for this product
              const prices = await stripe.prices.list({
                product: updatedProduct.id,
                active: true,
              });

              if (prices.data.length > 0) {
                // Deactivate old price
                await stripe.prices.update(prices.data[0].id, { active: false });
              }

              // Create new price
              await stripe.prices.create({
                product: updatedProduct.id,
                unit_amount: Math.round(item.price * 100), // Convert to cents
                currency: "eur",
              });
            }

            return {
              status: "updated",
              item_id: item.id,
              stripe_id: updatedProduct.id,
            };
          }

          return {
            status: "unchanged",
            item_id: item.id,
            stripe_id: existingProduct.id,
          };
        } else {
          // Create new product in Stripe
          const newProduct = await stripe.products.create({
            name: item.name,
            description: item.description || "",
            metadata: {
              item_id: item.id,
              category: categoryName,
              custom_pricing: item.custom_pricing ? "true" : "false",
            },
            active: true,
          });

          // Create price if not custom pricing
          if (item.price && !item.custom_pricing) {
            await stripe.prices.create({
              product: newProduct.id,
              unit_amount: Math.round(item.price * 100), // Convert to cents
              currency: "eur",
            });
          } else if (item.custom_pricing && item.unit_price) {
            // For custom pricing items, create a price with the unit price
            await stripe.prices.create({
              product: newProduct.id,
              unit_amount: Math.round(item.unit_price * 100), // Convert to cents
              currency: "eur",
              metadata: {
                unit_label: item.unit_label || "unit",
              },
            });
          }

          return {
            status: "created",
            item_id: item.id,
            stripe_id: newProduct.id,
          };
        }
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error);
        return {
          status: "error",
          item_id: item.id,
          error: error.message,
        };
      }
    })
  );

  // Find products in Stripe that don't exist in our database and deactivate them
  const dbItemIds = new Set(items.map((item) => item.id));
  const productsToDeactivate = existingProducts.data.filter(
    (product) => product.metadata.item_id && !dbItemIds.has(product.metadata.item_id)
  );

  const deactivationResults = await Promise.all(
    productsToDeactivate.map(async (product) => {
      try {
        await stripe.products.update(product.id, { active: false });
        return {
          status: "deactivated",
          stripe_id: product.id,
          item_id: product.metadata.item_id,
        };
      } catch (error) {
        return {
          status: "error",
          stripe_id: product.id,
          item_id: product.metadata.item_id,
          error: error.message,
        };
      }
    })
  );

  return new Response(
    JSON.stringify({
      success: true,
      results: {
        processed: results,
        deactivated: deactivationResults,
      },
      counts: {
        total: items.length,
        created: results.filter((r) => r.status === "created").length,
        updated: results.filter((r) => r.status === "updated").length,
        unchanged: results.filter((r) => r.status === "unchanged").length,
        errors: results.filter((r) => r.status === "error").length,
        deactivated: deactivationResults.length,
      },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function handleGetProducts() {
  const products = await stripe.products.list({
    limit: 100,
    active: true,
    expand: ["data.default_price"],
  });

  return new Response(JSON.stringify({ products: products.data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}