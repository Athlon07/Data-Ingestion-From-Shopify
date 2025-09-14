// backend/src/webhooks/orders.js
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function verifyWebhook(req) {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
  const digest = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(req.rawBody, "utf8")
    .digest("base64");
  return digest === hmacHeader;
}

export async function ordersWebhook(req, res) {
  if (!verifyWebhook(req)) {
    return res.status(401).send("Unauthorized");
  }

  const o = req.body;
  console.log("📩 Order webhook:", o.id);

  try {
    await prisma.order.upsert({
      where: { id: BigInt(o.id) },
      update: {
        shopifyOrderId: BigInt(o.id),
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        acceptsMarketing: o.buyer_accepts_marketing ?? false,
        currency: o.currency,
        subtotal: parseFloat(o.subtotal_price) || 0,
        shipping: parseFloat(o.total_shipping_price_set?.shop_money?.amount) || 0,
        taxes: parseFloat(o.total_tax) || 0,
        total: parseFloat(o.total_price) || 0,
        discountCode: o.discount_codes?.[0]?.code ?? null,
        discountAmount: o.discount_codes?.[0]?.amount
          ? parseFloat(o.discount_codes[0].amount)
          : null,
        shippingMethod: o.shipping_lines?.[0]?.title ?? null,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at),
        customerId: o.customer ? BigInt(o.customer.id) : null,
      },
      create: {
        id: BigInt(o.id),
        shopifyOrderId: BigInt(o.id),
        financialStatus: o.financial_status,
        fulfillmentStatus: o.fulfillment_status,
        acceptsMarketing: o.buyer_accepts_marketing ?? false,
        currency: o.currency,
        subtotal: parseFloat(o.subtotal_price) || 0,
        shipping: parseFloat(o.total_shipping_price_set?.shop_money?.amount) || 0,
        taxes: parseFloat(o.total_tax) || 0,
        total: parseFloat(o.total_price) || 0,
        discountCode: o.discount_codes?.[0]?.code ?? null,
        discountAmount: o.discount_codes?.[0]?.amount
          ? parseFloat(o.discount_codes[0].amount)
          : null,
        shippingMethod: o.shipping_lines?.[0]?.title ?? null,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at),
        customerId: o.customer ? BigInt(o.customer.id) : null,
      },
    });

    // order items
    for (const li of o.line_items) {
      await prisma.orderItem.upsert({
        where: { id: BigInt(li.id) },
        update: {
          quantity: li.quantity,
          price: parseFloat(li.price),
          productId: li.product_id ? BigInt(li.product_id) : null,
          variantId: li.variant_id ? BigInt(li.variant_id) : null,
          orderId: BigInt(o.id),
        },
        create: {
          id: BigInt(li.id),
          quantity: li.quantity,
          price: parseFloat(li.price),
          productId: li.product_id ? BigInt(li.product_id) : null,
          variantId: li.variant_id ? BigInt(li.variant_id) : null,
          orderId: BigInt(o.id),
        },
      });
    }

    res.status(200).send("Order synced");
  } catch (err) {
    console.error("❌ Error syncing order:", err);
    res.status(500).send("Error");
  }
}
