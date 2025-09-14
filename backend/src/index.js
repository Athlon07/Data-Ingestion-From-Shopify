// backend/src/index.js
const express = require('express');
const bodyParser = require('body-parser');
const { handleWebhook } = require('./webhooks');
const { syncProducts, syncCustomers, syncOrders } = require('./shopifysync');

const app = express();
app.use(bodyParser.json({ verify: (req, res, buf) => (req.rawBody = buf) }));

// Webhook endpoint
app.post('/webhooks/shopify', handleWebhook);

// Manual sync routes for testing
app.post('/sync/:tenant', async (req, res) => {
  const tenant = req.body; // { shop, accessToken }
  await syncProducts(tenant);
  await syncCustomers(tenant);
  await syncOrders(tenant);
  res.send('Sync complete');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
