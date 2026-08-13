/**
 * 2D Car Racing Game - Express server
 * Serves the frontend from /public and exposes the JSON API under /api.
 */
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const { testConnection } = require('./config/db');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Unknown API route
app.use('/api', (req, res) => res.status(404).json({ message: 'Route not found.' }));

// Central error handler - every route calls next(err) and lands here.
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await testConnection();
    console.log('[db] connected to MySQL');
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    console.error('     Check your .env values and make sure MySQL is running.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`[server] running at http://localhost:${PORT}`);
  });
})();
