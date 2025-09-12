require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const prisma = require('./db');

// Route imports
const tenantRoutes = require('./routes/tenants');
const syncRoutes = require('./routes/sync');
const metricsRoutes = require('./routes/metrics');

const app = express();

// keep raw body for HMAC verification
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(cors());

// Register routes
app.use('/api/tenants', tenantRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/metrics', metricsRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Backend running' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
