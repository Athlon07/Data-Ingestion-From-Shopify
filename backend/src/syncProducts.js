const { PrismaClient } = require("@prisma/client");
const fetch = require("node-fetch"); // make sure node-fetch@2 is installed

const prisma = new PrismaClient();

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// Fetch products from Shopify
async function fetchShopifyProducts() {
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/2025-01/products.json`, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Error fetching products: ${res.statusText}`);
  }

  const data = await res.json();
  return data.products;
}

// Sync products and variants into Prisma
async function syncProducts() {
  try {
    const products = await fetchShopifyProducts();

    for (const p of products) {
      // Upsert product
      const product = await prisma.product.upsert({
        where: { id: BigInt(p.id) },
        update: {
          title: p.title,
          handle: p.handle,
          vendor: p.vendor,
          productType: p.product_type,
          bodyHtml: p.body_html,
          tags: p.tags,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        },
        create: {
          id: BigInt(p.id),
          title: p.title,
          handle: p.handle,
          vendor: p.vendor,
          productType: p.product_type,
          bodyHtml: p.body_html,
          tags: p.tags,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        },
      });

      // Upsert variants
      for (const v of p.variants) {
        await prisma.productVariant.upsert({
          where: { id: BigInt(v.id) },
          update: {
            title: v.title,
            sku: v.sku ?? "",   // Optional SKU
            price: parseFloat(v.price),
            inventory: v.inventory_quantity ?? -1,
            requiresShipping: v.requires_shipping ?? true,
            taxable: v.taxable ?? true,
            productId: BigInt(p.id),
          },
          create: {
            id: BigInt(v.id),
            title: v.title,
            sku: v.sku ?? "",   // Optional SKU
            price: parseFloat(v.price),
            inventory: v.inventory_quantity ?? -1,
            requiresShipping: v.requires_shipping ?? true,
            taxable: v.taxable ?? true,
            product: { connect: { id: BigInt(p.id) } }, // Connect variant to product
          },
        });
      }
    }

    console.log("Products and variants synced successfully!");
  } catch (error) {
    console.error("Error syncing products:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncProducts();
