// backend/src/webhooks.js
const crypto = require('crypto');
const { syncProducts, syncCustomers, syncOrders } = require('./shopifysync');

function verifyShopifyWebhook(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const body = req.rawBody;
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  return hash === hmac;
}

async function handleWebhook(req, res) {
  if (!verifyShopifyWebhook(req)) return res.status(401).send('Invalid webhook');

  const topic = req.headers['x-shopify-topic'];
  const payload = req.body;

  // Example: sync single entity on webhook
  switch (topic) {
    case 'products/update':
    case 'products/create':
      await syncProducts({ shop: payload.shop_domain, accessToken: process.env.SHOPIFY_ACCESS_TOKEN });
      break;
    case 'customers/create':
    case 'customers/update':
      await syncCustomers({ shop: payload.shop_domain, accessToken: process.env.SHOPIFY_ACCESS_TOKEN });
      break;
    case 'orders/create':
    case 'orders/updated':
      await syncOrders({ shop: payload.shop_domain, accessToken: process.env.SHOPIFY_ACCESS_TOKEN });
      break;
    default:
      console.log('Unhandled webhook topic', topic);
  }

  res.status(200).send('Webhook processed');
}

module.exports = { handleWebhook };
