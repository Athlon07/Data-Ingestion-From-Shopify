// backend/src/index.js
import express from "express";
import bodyParser from "body-parser";
import open from "open";

// Import webhook handlers (make sure these are in ESM format)
import { customersWebhook } from "./webhooks/customers.js";
import { ordersWebhook } from "./webhooks/orders.js";
import { productsWebhook } from "./webhooks/products.js";

const app = express();

// Middleware to preserve raw body for Shopify HMAC verification
app.use(bodyParser.json({ verify: (req, res, buf) => (req.rawBody = buf) }));

// Home route for browser testing
app.get("/", (req, res) => {
  res.send("<h1>Server is running 🚀</h1><p>Webhook endpoints:</p><ul><li>/webhooks/customers</li><li>/webhooks/orders</li><li>/webhooks/products</li></ul>");
});

// Shopify webhook endpoints
app.post("/webhooks/customers", customersWebhook);
app.post("/webhooks/orders", ordersWebhook);
app.post("/webhooks/products", productsWebhook);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Automatically open browser
  open(`http://localhost:${PORT}`);
});
