// backend/src/webhooks/products.js
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

export async function productsWebhook(req, res) {
  if (!verifyWebhook(req)) {
    return res.status(401).send("Unauthorized");
  }

  const p = req.body;
  console.log("📩 Product webhook:", p.id);

  try {
    await prisma.product.upsert({
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

    // variants
    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { id: BigInt(v.id) },
        update: {
          title: v.title,
          sku: v.sku ?? null,
          price: parseFloat(v.price),
          inventory: v.inventory_quantity ?? -1,
          requiresShipping: v.requires_shipping ?? true,
          taxable: v.taxable ?? true,
          productId: BigInt(p.id),
        },
        create: {
          id: BigInt(v.id),
          title: v.title,
          sku: v.sku ?? null,
          price: parseFloat(v.price),
          inventory: v.inventory_quantity ?? -1,
          requiresShipping: v.requires_shipping ?? true,
          taxable: v.taxable ?? true,
          productId: BigInt(p.id),
        },
      });
    }

    res.status(200).send("Product synced");
  } catch (err) {
    console.error("❌ Error syncing product:", err);
    res.status(500).send("Error");
  }
}
