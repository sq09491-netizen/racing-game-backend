-- ============================================================
--  2D Car Racing Game - Database Schema
--  MySQL 8.0+
--  Run:  mysql -u root -p < database/schema.sql
-- ============================================================

DROP DATABASE IF EXISTS car_racing_game;
CREATE DATABASE car_racing_game
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE car_racing_game;

-- ------------------------------------------------------------
-- Table 1: users
-- Stores registration + login credentials.
-- Password is never stored in plain text (bcrypt hash only).
-- ------------------------------------------------------------
CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)  NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  high_score    INT          NOT NULL DEFAULT 0,
  total_coins   INT          NOT NULL DEFAULT 0,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table 2: scores
-- One row per completed game. Used for the leaderboard.
-- ------------------------------------------------------------
CREATE TABLE scores (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT       NOT NULL,
  score        INT       NOT NULL,
  coins        INT       NOT NULL DEFAULT 0,
  distance_m   INT       NOT NULL DEFAULT 0,
  top_speed    INT       NOT NULL DEFAULT 0,
  played_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scores_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  INDEX idx_score_desc (score DESC),
  INDEX idx_user (user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table 3: game_history
-- Session-level log: when a player started/ended and how it ended.
-- Kept separate from `scores` so an abandoned game is still tracked.
-- ------------------------------------------------------------
CREATE TABLE game_history (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT       NOT NULL,
  score_id         INT       NULL,
  result           ENUM('crashed','quit') NOT NULL DEFAULT 'crashed',
  duration_seconds INT       NOT NULL DEFAULT 0,
  played_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_history_score
    FOREIGN KEY (score_id) REFERENCES scores(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- View: leaderboard (top 10 by best single run)
-- Handy for the viva - shows you can use views + joins.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  u.username,
  MAX(s.score)  AS best_score,
  SUM(s.coins)  AS coins,
  COUNT(s.id)   AS games_played
FROM users u
JOIN scores s ON s.user_id = u.id
GROUP BY u.id, u.username
ORDER BY best_score DESC;
