// backend/src/utils/shopifyClient.js
const axios = require('axios');
require('dotenv').config();

function createShopifyClient() {
  const shop = process.env.SHOPIFY_STORE;
  const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;

  if (!shop || !accessToken) throw new Error('SHOPIFY_STORE or SHOPIFY_ACCESS_TOKEN not set in .env');

  return axios.create({
    baseURL: `https://${shop}/admin/api/2025-01/`,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });
}

module.exports = { createShopifyClient };
