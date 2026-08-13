/**
 * Routes:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/* ---------------------------------- register --------------------------------- */
router.post('/register', async (req, res, next) => {
  try {
    const username = (req.body.username || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ message: 'Username must be 3-30 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'That username or email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const user = { id: result.insertId, username, highScore: 0, totalCoins: 0 };
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

/* ----------------------------------- login ----------------------------------- */
router.post('/login', async (req, res, next) => {
  try {
    const identifier = (req.body.identifier || '').trim();
    const password = req.body.password || '';

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Enter your username and password.' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password_hash, high_score, total_coins FROM users WHERE username = ? OR email = ? LIMIT 1',
      [identifier, identifier.toLowerCase()]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Wrong username or password.' });
    }

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Wrong username or password.' });
    }

    const user = {
      id: rows[0].id,
      username: rows[0].username,
      highScore: rows[0].high_score,
      totalCoins: rows[0].total_coins,
    };
    res.json({ token: signToken(user), user });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------------ me ------------------------------------- */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, email, high_score, total_coins, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Player not found.' });

    res.json({
      user: {
        id: rows[0].id,
        username: rows[0].username,
        email: rows[0].email,
        highScore: rows[0].high_score,
        totalCoins: rows[0].total_coins,
        createdAt: rows[0].created_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
