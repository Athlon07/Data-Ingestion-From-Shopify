// src/utils/verifyWebhook.js
import crypto from "crypto";

export function verifyWebhook(req, secret) {
  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
  const body = JSON.stringify(req.body);
  const digest = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");
  return digest === hmacHeader;
}
