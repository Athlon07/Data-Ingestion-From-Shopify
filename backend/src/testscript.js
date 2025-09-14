require('dotenv').config();
const { createShopifyClient } = require('./utils/shopifyClient');

async function test() {
  try {
    const client = createShopifyClient(); // no need to pass tenant
    const response = await client.get('/products.json?limit=5');
    console.log(response.data.products);
  } catch (err) {
    console.error('Error connecting to Shopify:', err.message);
  }
}

test();
