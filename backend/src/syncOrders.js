import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

async function fetchShopifyOrders() {
  const res = await fetch(`https://${SHOPIFY_STORE}/admin/api/2025-01/orders.json`, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`Error fetching orders: ${res.statusText}`);
  const data = await res.json();
  return data.orders;
}

async function syncOrders() {
  try {
    const orders = await fetchShopifyOrders();

    for (const o of orders) {
      const orderData = {
        shopifyOrderId: BigInt(o.id),
        customerId: o.customer ? BigInt(o.customer.id) : undefined,
        financialStatus: o.financial_status ?? "",
        fulfillmentStatus: o.fulfillment_status ?? "",
        acceptsMarketing: o.buyer_accepts_marketing ?? false,
        currency: o.currency,
        subtotal: parseFloat(o.subtotal_price ?? 0),
        shipping: parseFloat(o.total_shipping_price_set?.shop_money?.amount ?? 0),
        taxes: parseFloat(o.total_tax ?? 0),
        total: parseFloat(o.total_price ?? 0),
        discountCode: o.discount_codes?.[0]?.code ?? null,
        discountAmount: o.discount_codes?.[0]?.amount
          ? parseFloat(o.discount_codes[0].amount)
          : null,
        shippingMethod: o.shipping_lines?.[0]?.title ?? null,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at),
      };

      // 🔹 Upsert order by shopifyOrderId
      const order = await prisma.order.upsert({
        where: { shopifyOrderId: BigInt(o.id) },
        update: orderData,
        create: orderData,
      });

      // 🔹 Use `order.id` (the real PK) for order items
      for (const li of o.line_items) {
        const itemData = {
          orderId: order.id, // ✅ real PK from Prisma
          productId: li.product_id ? BigInt(li.product_id) : undefined,
          variantId: li.variant_id ? BigInt(li.variant_id) : undefined,
          quantity: li.quantity,
          price: parseFloat(li.price ?? 0),
          requiresShipping: li.requires_shipping ?? true,
          taxable: li.taxable ?? true,
          fulfillmentStatus: li.fulfillment_status ?? null,
        };

        await prisma.orderItem.upsert({
          where: { id: BigInt(li.id) },
          update: itemData,
          create: { id: BigInt(li.id), ...itemData },
        });
      }
    }

    console.log("✅ Orders and line items synced successfully!");
  } catch (err) {
    console.error("❌ Error syncing orders:", err);
  } finally {
    await prisma.$disconnect();
  }
}

syncOrders();
