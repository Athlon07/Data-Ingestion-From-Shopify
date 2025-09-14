import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

// 🔹 Fetch products from Shopify
async function fetchShopifyProducts() {
  const res = await fetch(
    `https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/products.json`,
    {
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) throw new Error(`Failed to fetch products: ${res.statusText}`);
  const data = await res.json();
  return data.products;
}

// 🔹 Fetch customers from Shopify
async function fetchShopifyCustomers() {
  const res = await fetch(
    `https://${process.env.SHOPIFY_STORE}/admin/api/2023-10/customers.json`,
    {
      headers: {
        "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) throw new Error(`Failed to fetch customers: ${res.statusText}`);
  const data = await res.json();
  return data.customers;
}

// 🔹 Sync products
async function syncProducts() {
  const products = await fetchShopifyProducts();

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { id: BigInt(p.id) },
      update: {
        title: p.title,
        bodyHtml: p.body_html,
        vendor: p.vendor,
        productType: p.product_type,
        handle: p.handle,
        status: p.status,
        updatedAt: new Date(p.updated_at),
      },
      create: {
        id: BigInt(p.id),
        title: p.title,
        bodyHtml: p.body_html,
        vendor: p.vendor,
        productType: p.product_type,
        handle: p.handle,
        status: p.status,
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at),
      },
    });

    // 🔹 Sync variants
    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { id: BigInt(v.id) },
        update: {
          title: v.title,
          sku: v.sku ?? null,
          price: parseFloat(v.price),
          inventory: v.inventory_quantity ?? -1,
          requiresShipping: v.requires_shipping,
          taxable: v.taxable,
          productId: BigInt(p.id),
        },
        create: {
          id: BigInt(v.id),
          title: v.title,
          sku: v.sku ?? null,
          price: parseFloat(v.price),
          inventory: v.inventory_quantity ?? -1,
          requiresShipping: v.requires_shipping,
          taxable: v.taxable,
          product: { connect: { id: BigInt(p.id) } },
        },
      });
    }
  }
  console.log("✅ Products synced");
}

// 🔹 Sync customers
// 🔹 Sync customers
async function syncCustomers() {
  const customers = await fetchShopifyCustomers();

  for (const c of customers) {
    const id = BigInt(c.id);

    // Map Shopify -> local schema
    const acceptsEmail = c.accepts_marketing ?? false; // Shopify field

    const createData = {
      id,
      createdAt: c.created_at ? new Date(c.created_at) : new Date(),
      updatedAt: c.updated_at ? new Date(c.updated_at) : new Date(),
      acceptsEmail, // 👈 required
    };
    if (c.email) createData.email = c.email;
    if (c.first_name) createData.firstName = c.first_name;
    if (c.last_name) createData.lastName = c.last_name;
    if (c.phone) createData.phone = c.phone;

    const updateData = {
      updatedAt: new Date(),
      acceptsEmail, // 👈 required
    };
    if (c.email) updateData.email = c.email;
    if (c.first_name) updateData.firstName = c.first_name;
    if (c.last_name) updateData.lastName = c.last_name;
    if (c.phone) updateData.phone = c.phone;

    await prisma.customer.upsert({
      where: { id },
      update: updateData,
      create: createData,
    });
  }
  console.log("✅ Customers synced");
}


// 🔹 Run everything
async function runAll() {
  try {
    await syncProducts();
    await syncCustomers();
    console.log("🎉 All sync tasks completed successfully");
  } catch (err) {
    console.error("❌ Sync failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runAll();
