# 2D Car Racing Game — Full Stack Project

Top-down endless car racing game with user accounts, score saving and a global leaderboard.

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, vanilla JavaScript (Canvas 2D API) |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Auth | bcryptjs (password hashing) + JWT |

No image or audio files are needed — every car, coin and tree is drawn with canvas code, and the sound effects are generated with the Web Audio API.

---

## 1. Requirements

- Node.js 18 or newer
- MySQL 8.0 or newer (XAMPP / WAMP / MySQL Workbench all work)

## 2. Setup

```bash
# 1. install packages
npm install

# 2. create the database and tables
mysql -u root -p < database/schema.sql

# 3. configure environment variables
cp .env.example .env        # Windows: copy .env.example .env
#    then open .env and set DB_PASSWORD and JWT_SECRET

# 4. run
npm start
```

Open **http://localhost:3000** in your browser.

> Using XAMPP? Start MySQL from the control panel, leave `DB_USER=root` and `DB_PASSWORD=` empty, then import `database/schema.sql` through phpMyAdmin.

---

## 3. Folder structure

```
car-racing-game/
├── server.js               Express app: middleware, routes, error handler
├── config/db.js            MySQL connection pool
├── middleware/auth.js      Verifies the JWT on protected routes
├── routes/
│   ├── auth.js             register / login / me
│   └── game.js             save score / leaderboard / history
├── database/schema.sql     Tables + leaderboard view
└── public/
    ├── index.html          Login and registration
    ├── game.html           The game screen
    ├── leaderboard.html    Top 10 + personal history
    ├── css/style.css       Shared styles
    ├── css/game.css        Game screen styles
    └── js/
        ├── api.js          fetch() wrapper, token storage
        ├── auth.js         Login page logic
        ├── game.js         Game engine (loop, physics, drawing)
        └── leaderboard.js  Table rendering
```

---

## 4. Database tables

**users** — `id`, `username`, `email`, `password_hash`, `high_score`, `total_coins`, `created_at`

**scores** — `id`, `user_id` (FK), `score`, `coins`, `distance_m`, `top_speed`, `played_at`

**game_history** — `id`, `user_id` (FK), `score_id` (FK), `result`, `duration_seconds`, `played_at`

`scores` holds the numbers used for ranking; `game_history` logs the session itself, so a game the player quit is still recorded even though it does not compete on the leaderboard.

---

## 5. API reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create an account, returns a JWT |
| POST | `/api/auth/login` | — | Sign in, returns a JWT |
| GET | `/api/auth/me` | JWT | Current player's profile |
| POST | `/api/game/score` | JWT | Save a finished run |
| GET | `/api/game/leaderboard` | — | Top 10 players |
| GET | `/api/game/history` | JWT | Player's last 10 runs |
| GET | `/api/health` | — | Server status check |

Example:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"arjun","email":"arjun@test.com","password":"secret123"}'
```

---

## 6. How the game works

**The loop.** `requestAnimationFrame` calls `loop()` roughly 60 times a second. Each frame measures the real time since the previous frame and converts it into a `step` multiplier, so the car moves at the same speed on a 60 Hz laptop and a 144 Hz monitor.

**The illusion of movement.** The player's car never actually moves down the screen — it stays at a fixed y. Instead the lane markings, the trees and the other cars scroll downward at the player's current speed. Faster speed, faster scroll.

**Traffic.** Enemy cars spawn above the top edge in a random lane and move at their own slower speed. Their on-screen movement is `playerSpeed − enemySpeed`, which is why they appear to drift backwards toward you.

**Collision detection.** Every car is treated as a rectangle. Two rectangles overlap only when they overlap on both axes at once — that is the whole `overlaps()` function. A small inset makes near-misses forgiving rather than frustrating.

**Difficulty.** A level counter rises with distance travelled. Higher levels raise the minimum speed and shorten the gap between spawns.

---

## 7. Things you can add for extra marks

- Car selection screen (change the player colour, store the choice in `users`)
- Power-ups: shield, slow-motion, double coins
- Day/night cycle by tinting the canvas over time
- Difficulty setting saved per user
- `/api/game/stats` endpoint with average score and total distance
- Deploy the backend on Render and the database on a free MySQL host

---

## 8. Common problems

| Problem | Fix |
|---|---|
| `[db] connection failed` | MySQL isn't running, or `.env` has the wrong password |
| `ER_BAD_DB_ERROR` | You skipped `mysql -u root -p < database/schema.sql` |
| Blank page, 404 on CSS | Run `npm start` from the project root, not from inside `public/` |
| Score not saving | Session expired — sign out and sign in again |
| Fonts look plain | Google Fonts needs internet; the fallback fonts are fine offline |
