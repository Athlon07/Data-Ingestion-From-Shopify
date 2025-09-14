// backend/src/shopifySync.js
const prisma = require('./db');
const { createShopifyClient } = require('./utils/shopifyClient');

async function syncProducts(tenant) {
  const client = createShopifyClient(tenant);
  const response = await client.get('/products.json?limit=250');
  const products = response.data.products;

  for (const p of products) {
    for (const variant of p.variants) {
      await prisma.product.upsert({
        where: { variant_sku: variant.sku },
        update: {
          title: p.title,
          body_html: p.body_html,
          vendor: p.vendor,
          type: p.product_type,
          variant_price: parseFloat(variant.price),
          variant_inventory_qty: variant.inventory_quantity,
        },
        create: {
          handle: p.handle,
          title: p.title,
          body_html: p.body_html,
          vendor: p.vendor,
          type: p.product_type,
          variant_sku: variant.sku,
          variant_price: parseFloat(variant.price),
          variant_inventory_qty: variant.inventory_quantity,
        },
      });
    }
  }
}

async function syncCustomers(tenant) {
  const client = createShopifyClient(tenant);
  const response = await client.get('/customers.json?limit=250');
  const customers = response.data.customers;

  for (const c of customers) {
    await prisma.customer.upsert({
      where: { email: c.email },
      update: {
        first_name: c.first_name,
        last_name: c.last_name,
        accepts_email_marketing: c.accepts_marketing,
      },
      create: {
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        accepts_email_marketing: c.accepts_marketing,
      },
    });
  }
}

async function syncOrders(tenant) {
  const client = createShopifyClient(tenant);
  const response = await client.get('/orders.json?limit=250&status=any');
  const orders = response.data.orders;

  for (const o of orders) {
    const customer = o.customer
      ? await prisma.customer.upsert({
          where: { email: o.customer.email },
          update: { first_name: o.customer.first_name, last_name: o.customer.last_name },
          create: { first_name: o.customer.first_name, last_name: o.customer.last_name, email: o.customer.email },
        })
      : null;

    const orderRecord = await prisma.order.upsert({
      where: { order_number: o.name },
      update: { total: parseFloat(o.total_price), customer_id: customer?.id },
      create: {
        order_number: o.name,
        total: parseFloat(o.total_price),
        customer_id: customer?.id,
      },
    });

    for (const item of o.line_items) {
      const product = await prisma.product.findUnique({ where: { variant_sku: item.sku } });
      await prisma.orderItem.upsert({
        where: { order_id_product_id: { order_id: orderRecord.id, product_id: product?.id || 0 } },
        update: { quantity: item.quantity, price: parseFloat(item.price) },
        create: {
          order_id: orderRecord.id,
          product_id: product?.id,
          quantity: item.quantity,
          price: parseFloat(item.price),
          name: item.name,
          sku: item.sku,
        },
      });
    }
  }
}

module.exports = { syncProducts, syncCustomers, syncOrders };
