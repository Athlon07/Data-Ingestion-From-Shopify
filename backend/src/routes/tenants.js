const express = require('express');
const prisma = require('../prisma');

const router = express.Router();

// POST /api/tenants - onboard or update tenant
router.post('/', async (req, res) => {
  try {
    const { name, shopDomain, accessToken } = req.body;
    if (!shopDomain || !accessToken) {
      return res.status(400).json({ error: 'shopDomain and accessToken required' });
    }
    const tenant = await prisma.tenant.upsert({
      where: { shopDomain },
      update: { name, accessToken },
      create: { name, shopDomain, accessToken },
    });
    res.json(tenant);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'failed to create tenant' });
  }
});

module.exports = router;
