// backend/src/webhooks/customers.js
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

export async function customersWebhook(req, res) {
  if (!verifyWebhook(req)) {
    return res.status(401).send("Unauthorized");
  }

  const c = req.body;
  console.log("📩 Customer webhook:", c.id);

  try {
    await prisma.customer.upsert({
      where: { id: BigInt(c.id) },
      update: {
        firstName: c.first_name ?? null,
        lastName: c.last_name ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        acceptsEmail: c.accepts_marketing ?? false,
        acceptsSMS: c.accepts_marketing_sms ?? false,
        defaultAddress: c.default_address?.address1 ?? null,
        city: c.default_address?.city ?? null,
        provinceCode: c.default_address?.province_code ?? null,
        countryCode: c.default_address?.country_code ?? null,
        zip: c.default_address?.zip ?? null,
        tags: c.tags ?? null,
        taxExempt: c.tax_exempt ?? false,
      },
      create: {
        id: BigInt(c.id),
        firstName: c.first_name ?? null,
        lastName: c.last_name ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        acceptsEmail: c.accepts_marketing ?? false,
        acceptsSMS: c.accepts_marketing_sms ?? false,
        defaultAddress: c.default_address?.address1 ?? null,
        city: c.default_address?.city ?? null,
        provinceCode: c.default_address?.province_code ?? null,
        countryCode: c.default_address?.country_code ?? null,
        zip: c.default_address?.zip ?? null,
        tags: c.tags ?? null,
        taxExempt: c.tax_exempt ?? false,
      },
    });

    res.status(200).send("Customer synced");
  } catch (err) {
    console.error("❌ Error syncing customer:", err);
    res.status(500).send("Error");
  }
}
