/**
 * Routes:
 *   POST /api/game/score        save a finished run
 *   GET  /api/game/leaderboard  top 10 players
 *   GET  /api/game/history      logged-in player's last 10 runs
 */
const express = require('express');
const { pool } = require('../config/db');
const requireAuth = require('../middleware/auth');

const router = express.Router();

/* -------------------------------- save a run --------------------------------- */
router.post('/score', requireAuth, async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const score = Math.max(0, parseInt(req.body.score, 10) || 0);
    const coins = Math.max(0, parseInt(req.body.coins, 10) || 0);
    const distance = Math.max(0, parseInt(req.body.distance, 10) || 0);
    const topSpeed = Math.max(0, parseInt(req.body.topSpeed, 10) || 0);
    const duration = Math.max(0, parseInt(req.body.duration, 10) || 0);
    const result = req.body.result === 'quit' ? 'quit' : 'crashed';

    // A transaction keeps the three writes consistent:
    // if any one fails, none of them are applied.
    await conn.beginTransaction();

    const [scoreRow] = await conn.query(
      'INSERT INTO scores (user_id, score, coins, distance_m, top_speed) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, score, coins, distance, topSpeed]
    );

    await conn.query(
      'INSERT INTO game_history (user_id, score_id, result, duration_seconds) VALUES (?, ?, ?, ?)',
      [req.user.id, scoreRow.insertId, result, duration]
    );

    await conn.query(
      'UPDATE users SET high_score = GREATEST(high_score, ?), total_coins = total_coins + ? WHERE id = ?',
      [score, coins, req.user.id]
    );

    const [userRows] = await conn.query(
      'SELECT high_score, total_coins FROM users WHERE id = ?',
      [req.user.id]
    );

    await conn.commit();

    res.status(201).json({
      saved: true,
      isNewHighScore: score >= userRows[0].high_score && score > 0,
      highScore: userRows[0].high_score,
      totalCoins: userRows[0].total_coins,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

/* -------------------------------- leaderboard -------------------------------- */
router.get('/leaderboard', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.username,
              MAX(s.score)  AS score,
              SUM(s.coins)  AS coins,
              COUNT(s.id)   AS games
       FROM users u
       JOIN scores s ON s.user_id = u.id
       GROUP BY u.id, u.username
       ORDER BY score DESC, coins DESC
       LIMIT 10`
    );
    res.json({ leaderboard: rows });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------- history ---------------------------------- */
router.get('/history', requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.score, s.coins, s.distance_m, s.top_speed,
              h.result, h.duration_seconds, s.played_at
       FROM scores s
       LEFT JOIN game_history h ON h.score_id = s.id
       WHERE s.user_id = ?
       ORDER BY s.played_at DESC
       LIMIT 10`,
      [req.user.id]
    );
    res.json({ history: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
