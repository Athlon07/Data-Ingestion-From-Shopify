import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

const prisma = new PrismaClient();

const SHOPIFY_STORE = process.env.SHOPIFY_STORE;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

// 🔹 Fetch customers from Shopify
async function fetchShopifyCustomers() {
  const res = await fetch(
    `https://${SHOPIFY_STORE}/admin/api/2025-01/customers.json`,
    {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error(`Error fetching customers: ${res.statusText}`);
  }

  const data = await res.json();
  return data.customers || [];
}

// 🔹 Sync customers into Prisma
async function syncCustomers() {
  try {
    const customers = await fetchShopifyCustomers();
    console.log(`📦 Fetched ${customers.length} customers. Syncing...`);

    for (const c of customers) {
      // fallback name parsing if Shopify leaves them null
      let firstName = c.first_name ?? null;
      let lastName = c.last_name ?? null;

      if ((!firstName || !lastName) && c.default_address?.name) {
        const [f, ...rest] = c.default_address.name.split(" ");
        firstName = firstName || f;
        lastName = lastName || (rest.length ? rest.join(" ") : null);
      }

      const customerData = {
        firstName,
        lastName,
        email: c.email ?? null,
        phone: c.phone ?? null,
        acceptsEmail: c.accepts_marketing === true,
        acceptsSMS: c.accepts_marketing_sms === true,
        defaultAddress: c.default_address?.address1 ?? null,
        city: c.default_address?.city ?? null,
        provinceCode: c.default_address?.province_code ?? null,
        countryCode: c.default_address?.country_code ?? null,
        zip: c.default_address?.zip ?? null,
        tags: c.tags ?? null,
        taxExempt: c.tax_exempt ?? false,
      };

      console.log("➡️ Upserting customer:", c.id, customerData);

      await prisma.customer.upsert({
        where: { id: BigInt(c.id) },
        update: customerData,
        create: {
          id: BigInt(c.id),
          ...customerData,
        },
      });
    }

    console.log("✅ Customers synced successfully!");
  } catch (err) {
    console.error("❌ Error syncing customers:", err);
  } finally {
    await prisma.$disconnect();
  }
}

// 🔹 Run script
syncCustomers();
