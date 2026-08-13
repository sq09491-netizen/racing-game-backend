/* ============================================================================
   2D Car Racing Game — game engine
   Top-down endless racer drawn entirely with the Canvas 2D API.
   No image assets required, so the project runs offline out of the box.
   ========================================================================== */

(function () {
  'use strict';

  if (!API.requireLogin()) return;

  /* ------------------------------- constants ------------------------------ */

  const CONFIG = {
    W: 480,
    H: 640,
    ROAD_LEFT: 70,
    ROAD_RIGHT: 410,
    LANES: 4,
    CAR_W: 46,
    CAR_H: 84,
    PLAYER_Y: 510,
    STEER_SPEED: 5.2,        // px per frame sideways
    MIN_SPEED: 3.2,
    MAX_SPEED: 12,
    START_SPEED: 4.5,
    ACCEL: 0.09,             // when holding Up
    BRAKE: 0.14,             // when holding Down
    DRAG: 0.02,              // pulls back toward cruise speed
    SPAWN_EVERY: 78,         // frames between traffic spawns at level 1
    COIN_EVERY: 130,
  };

  const ROAD_W = CONFIG.ROAD_RIGHT - CONFIG.ROAD_LEFT;
  const LANE_W = ROAD_W / CONFIG.LANES;

  const ENEMY_COLORS = ['#3d7ee8', '#e8a33d', '#c8ced8', '#8b5ce8', '#e35d8a'];

  /** Centre x of a lane index (0 = leftmost). */
  function laneCenter(i) {
    return CONFIG.ROAD_LEFT + LANE_W * i + LANE_W / 2;
  }

  /* --------------------------------- setup -------------------------------- */

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const els = {
    driverName: document.getElementById('driverName'),
    bestScore: document.getElementById('bestScore'),
    hudScore: document.getElementById('hudScore'),
    hudSpeed: document.getElementById('hudSpeed'),
    hudCoins: document.getElementById('hudCoins'),
    menu: document.getElementById('menuScreen'),
    pause: document.getElementById('pauseScreen'),
    over: document.getElementById('gameOver'),
    finalScore: document.getElementById('finalScore'),
    finalCoins: document.getElementById('finalCoins'),
    finalDistance: document.getElementById('finalDistance'),
    saveNote: document.getElementById('saveNote'),
  };

  const user = API.getUser() || {};
  els.driverName.textContent = user.username || 'Player';
  els.bestScore.textContent = user.highScore || 0;

  /* --------------------------------- state -------------------------------- */

  let state; // set by resetGame()
  let mode = 'menu'; // menu | running | paused | over
  let lastFrame = 0;
  let rafId = null;

  const keys = Object.create(null);

  function resetGame() {
    state = {
      player: { x: laneCenter(1), y: CONFIG.PLAYER_Y },
      speed: CONFIG.START_SPEED,
      topSpeed: CONFIG.START_SPEED,
      enemies: [],
      coins: [],
      props: makeProps(),
      roadOffset: 0,
      score: 0,
      coinCount: 0,
      distance: 0,
      frame: 0,
      spawnTimer: 0,
      coinTimer: 60,
      startedAt: Date.now(),
    };
  }

  /** Roadside trees/bushes. They loop forever by wrapping their y value. */
  function makeProps() {
    const props = [];
    for (let i = 0; i < 14; i++) {
      props.push({
        side: i % 2 === 0 ? 'left' : 'right',
        x: 8 + Math.random() * 46,
        y: Math.random() * (CONFIG.H + 120) - 60,
        size: 16 + Math.random() * 14,
        tone: Math.random(),
      });
    }
    return props;
  }

  /* --------------------------------- audio -------------------------------- */
  /* Tiny WebAudio blips — no sound files needed. */

  const Sound = (() => {
    let ac = null;
    function tone(freq, duration, type = 'square', gain = 0.05) {
      try {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ac.createOscillator();
        const vol = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        vol.gain.setValueAtTime(gain, ac.currentTime);
        vol.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + duration);
        osc.connect(vol).connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + duration);
      } catch {
        /* audio is optional */
      }
    }
    return {
      coin: () => tone(880, 0.12, 'square', 0.04),
      crash: () => tone(110, 0.45, 'sawtooth', 0.09),
    };
  })();

  /* --------------------------------- input -------------------------------- */

  const HANDLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];

  document.addEventListener('keydown', (e) => {
    if (HANDLED_KEYS.includes(e.key)) e.preventDefault();
    keys[e.key] = true;

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
    if (e.key === 'Enter' && mode !== 'running') {
      if (mode === 'menu') startGame();
      else if (mode === 'over') startGame();
    }
  });

  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
  });

  // On-screen buttons for phones.
  document.querySelectorAll('.touchpad button').forEach((btn) => {
    const key = btn.dataset.key;
    const press = (e) => { e.preventDefault(); keys[key] = true; };
    const release = (e) => { e.preventDefault(); keys[key] = false; };
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release);
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });

  /* ------------------------------ screen flow ----------------------------- */

  function show(overlay) {
    [els.menu, els.pause, els.over].forEach((o) => o.classList.remove('is-open'));
    if (overlay) overlay.classList.add('is-open');
  }

  function startGame() {
    resetGame();
    mode = 'running';
    show(null);
    els.saveNote.textContent = '';
    lastFrame = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (mode === 'running') {
      mode = 'paused';
      show(els.pause);
    } else if (mode === 'paused') {
      mode = 'running';
      show(null);
      lastFrame = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function backToMenu(result) {
    if (mode === 'running' || mode === 'paused') endGame(result || 'quit');
    mode = 'menu';
    show(els.menu);
  }

  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('menuStartBtn').addEventListener('click', startGame);
  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  document.getElementById('quitBtn').addEventListener('click', () => backToMenu('quit'));
  document.getElementById('homeBtn').addEventListener('click', () => {
    mode = 'menu';
    show(els.menu);
  });
  document.getElementById('logoutBtn').addEventListener('click', () => {
    API.clearSession();
    window.location.href = 'index.html';
  });

  // Pause automatically if the player switches tabs.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'running') togglePause();
  });

  /* --------------------------------- update ------------------------------- */

  function update(step) {
    const s = state;
    s.frame += step;

    /* --- speed ------------------------------------------------------------ */
    if (keys.ArrowUp) s.speed += CONFIG.ACCEL * step;
    else if (keys.ArrowDown) s.speed -= CONFIG.BRAKE * step;
    else s.speed += (CONFIG.START_SPEED - s.speed) * CONFIG.DRAG * step;

    // Difficulty creep: the floor speed rises the longer you survive.
    const level = 1 + Math.floor(s.distance / 700);
    const floor = Math.min(CONFIG.MIN_SPEED + level * 0.35, CONFIG.MAX_SPEED - 1);
    s.speed = Math.max(floor, Math.min(CONFIG.MAX_SPEED, s.speed));
    s.topSpeed = Math.max(s.topSpeed, s.speed);

    /* --- steering --------------------------------------------------------- */
    if (keys.ArrowLeft) s.player.x -= CONFIG.STEER_SPEED * step;
    if (keys.ArrowRight) s.player.x += CONFIG.STEER_SPEED * step;

    const half = CONFIG.CAR_W / 2;
    s.player.x = Math.max(
      CONFIG.ROAD_LEFT + half + 2,
      Math.min(CONFIG.ROAD_RIGHT - half - 2, s.player.x)
    );

    /* --- world scroll ----------------------------------------------------- */
    s.roadOffset = (s.roadOffset + s.speed * step) % 60;
    s.distance += (s.speed * step) / 3.2;
    s.score = Math.floor(s.distance) + s.coinCount * 25;

    /* --- roadside props --------------------------------------------------- */
    for (const p of s.props) {
      p.y += s.speed * step;
      if (p.y > CONFIG.H + 60) {
        p.y = -60;
        p.x = 8 + Math.random() * 46;
        p.size = 16 + Math.random() * 14;
        p.tone = Math.random();
      }
    }

    /* --- spawn traffic ---------------------------------------------------- */
    s.spawnTimer -= step;
    if (s.spawnTimer <= 0) {
      spawnEnemy(level);
      s.spawnTimer = Math.max(26, CONFIG.SPAWN_EVERY - level * 6);
    }

    s.coinTimer -= step;
    if (s.coinTimer <= 0) {
      spawnCoin();
      s.coinTimer = CONFIG.COIN_EVERY + Math.random() * 70;
    }

    /* --- move traffic ----------------------------------------------------- */
    for (const e of s.enemies) {
      // Enemies drive the same direction but slower, so they drift toward us.
      e.y += (s.speed - e.speed) * step;
    }
    s.enemies = s.enemies.filter((e) => e.y < CONFIG.H + 120);

    for (const c of s.coins) c.y += s.speed * step;
    s.coins = s.coins.filter((c) => c.y < CONFIG.H + 40);

    /* --- collisions ------------------------------------------------------- */
    const playerBox = {
      x: s.player.x - half,
      y: s.player.y - CONFIG.CAR_H / 2,
      w: CONFIG.CAR_W,
      h: CONFIG.CAR_H,
    };

    for (const e of s.enemies) {
      const enemyBox = {
        x: e.x - CONFIG.CAR_W / 2,
        y: e.y - CONFIG.CAR_H / 2,
        w: CONFIG.CAR_W,
        h: CONFIG.CAR_H,
      };
      if (overlaps(playerBox, enemyBox, 6)) {
        Sound.crash();
        endGame('crashed');
        return;
      }
    }

    for (let i = s.coins.length - 1; i >= 0; i--) {
      const c = s.coins[i];
      const coinBox = { x: c.x - 12, y: c.y - 12, w: 24, h: 24 };
      if (overlaps(playerBox, coinBox, 0)) {
        s.coins.splice(i, 1);
        s.coinCount++;
        Sound.coin();
      }
    }
  }

  /** Axis-aligned bounding box test with an optional forgiveness inset. */
  function overlaps(a, b, inset) {
    return (
      a.x + inset < b.x + b.w - inset &&
      a.x + a.w - inset > b.x + inset &&
      a.y + inset < b.y + b.h - inset &&
      a.y + a.h - inset > b.y + inset
    );
  }

  function spawnEnemy(level) {
    const s = state;
    const lane = Math.floor(Math.random() * CONFIG.LANES);
    const x = laneCenter(lane);

    // Don't stack two cars on top of each other in the same lane.
    const tooClose = s.enemies.some(
      (e) => Math.abs(e.x - x) < CONFIG.CAR_W && e.y < CONFIG.CAR_H * 2.2
    );
    if (tooClose) return;

    s.enemies.push({
      x,
      y: -CONFIG.CAR_H,
      speed: 1.4 + Math.random() * 1.6 + level * 0.12,
      color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
    });
  }

  function spawnCoin() {
    const lane = Math.floor(Math.random() * CONFIG.LANES);
    state.coins.push({ x: laneCenter(lane), y: -30 });
  }

  /* --------------------------------- render ------------------------------- */

  function draw() {
    const s = state;

    drawGrass(s);
    drawRoad(s);

    for (const c of s.coins) drawCoin(c.x, c.y, s.frame);
    for (const e of s.enemies) drawCar(e.x, e.y, e.color, false);
    drawCar(s.player.x, s.player.y, '#e33b4e', true);

    updateHud(s);
  }

  function drawGrass(s) {
    ctx.fillStyle = '#2f4620';
    ctx.fillRect(0, 0, CONFIG.W, CONFIG.H);

    for (const p of s.props) {
      const baseX = p.side === 'left' ? p.x : CONFIG.W - p.x - p.size;
      drawTree(baseX, p.y, p.size, p.tone);
    }
  }

  function drawTree(x, y, size, tone) {
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.ellipse(x + size / 2 + 3, y + size * 0.9, size * 0.55, size * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // trunk
    ctx.fillStyle = '#4a3524';
    ctx.fillRect(x + size / 2 - 3, y + size * 0.5, 6, size * 0.45);

    // canopy — two overlapping circles so it doesn't read as a plain dot
    const green = tone > 0.5 ? '#4d7a34' : '#3f6a2b';
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.42, size * 0.52, 0, Math.PI * 2);
    ctx.arc(x + size * 0.22, y + size * 0.6, size * 0.36, 0, Math.PI * 2);
    ctx.arc(x + size * 0.78, y + size * 0.6, size * 0.36, 0, Math.PI * 2);
    ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,.09)';
    ctx.beginPath();
    ctx.arc(x + size * 0.38, y + size * 0.3, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRoad(s) {
    // asphalt
    ctx.fillStyle = '#3b414a';
    ctx.fillRect(CONFIG.ROAD_LEFT, 0, ROAD_W, CONFIG.H);

    // subtle shoulder shading
    const grad = ctx.createLinearGradient(CONFIG.ROAD_LEFT, 0, CONFIG.ROAD_RIGHT, 0);
    grad.addColorStop(0, 'rgba(0,0,0,.22)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.fillStyle = grad;
    ctx.fillRect(CONFIG.ROAD_LEFT, 0, ROAD_W, CONFIG.H);

    // solid edge lines
    ctx.fillStyle = '#eef1f6';
    ctx.fillRect(CONFIG.ROAD_LEFT + 4, 0, 4, CONFIG.H);
    ctx.fillRect(CONFIG.ROAD_RIGHT - 8, 0, 4, CONFIG.H);

    // dashed lane dividers
    ctx.fillStyle = '#e6e9ef';
    for (let lane = 1; lane < CONFIG.LANES; lane++) {
      const x = CONFIG.ROAD_LEFT + LANE_W * lane - 2;
      for (let y = -60 + s.roadOffset; y < CONFIG.H; y += 60) {
        ctx.fillRect(x, y, 4, 32);
      }
    }
  }

  function drawCar(cx, cy, color, isPlayer) {
    const w = CONFIG.CAR_W;
    const h = CONFIG.CAR_H;
    const x = cx - w / 2;
    const y = cy - h / 2;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    roundRect(x + 3, y + 5, w, h, 9);
    ctx.fill();

    // wheels
    ctx.fillStyle = '#15171c';
    ctx.fillRect(x - 3, y + 12, 6, 20);
    ctx.fillRect(x + w - 3, y + 12, 6, 20);
    ctx.fillRect(x - 3, y + h - 32, 6, 20);
    ctx.fillRect(x + w - 3, y + h - 32, 6, 20);

    // body
    ctx.fillStyle = color;
    roundRect(x, y, w, h, 9);
    ctx.fill();

    // roof
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    roundRect(x + 6, y + h * 0.32, w - 12, h * 0.33, 5);
    ctx.fill();

    // windscreens
    ctx.fillStyle = '#a8c4dd';
    roundRect(x + 7, y + h * 0.18, w - 14, h * 0.14, 4);
    ctx.fill();
    roundRect(x + 7, y + h * 0.66, w - 14, h * 0.12, 4);
    ctx.fill();

    // centre stripe on the player car only
    if (isPlayer) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(cx - 2, y + 6, 4, h - 12);
    }

    // lights
    ctx.fillStyle = isPlayer ? '#fff3c4' : '#ffe9a8';
    ctx.fillRect(x + 5, y + 3, 9, 5);
    ctx.fillRect(x + w - 14, y + 3, 9, 5);
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(x + 5, y + h - 8, 9, 5);
    ctx.fillRect(x + w - 14, y + h - 8, 9, 5);
  }

  function drawCoin(x, y, frame) {
    // Squash the width on a sine wave so the coin looks like it is spinning.
    const spin = Math.abs(Math.cos(frame * 0.09));
    const rx = Math.max(2, 11 * spin);

    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, rx, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffc61a';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#c8930b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.6, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function updateHud(s) {
    els.hudScore.textContent = s.score;
    els.hudSpeed.textContent = Math.round(s.speed * 12);
    els.hudCoins.textContent = s.coinCount;
  }

  /* ------------------------------- game loop ------------------------------ */

  function loop(now) {
    if (mode !== 'running') return;

    // Delta time keeps the game running at the same pace on any monitor.
    const dt = now - lastFrame;
    lastFrame = now;
    const step = Math.min(dt / 16.667, 3);

    update(step);
    if (mode === 'running') {
      draw();
      rafId = requestAnimationFrame(loop);
    }
  }

  /* ------------------------------- game over ------------------------------ */

  async function endGame(result) {
    if (mode === 'over') return;
    const s = state;
    mode = 'over';
    cancelAnimationFrame(rafId);

    draw();

    els.finalScore.textContent = s.score;
    els.finalCoins.textContent = s.coinCount;
    els.finalDistance.textContent = Math.floor(s.distance);
    els.saveNote.textContent = 'Saving your run…';
    show(els.over);

    try {
      const data = await API.saveScore({
        score: s.score,
        coins: s.coinCount,
        distance: Math.floor(s.distance),
        topSpeed: Math.round(s.topSpeed * 12),
        duration: Math.round((Date.now() - s.startedAt) / 1000),
        result,
      });

      els.bestScore.textContent = data.highScore;
      els.saveNote.textContent = data.isNewHighScore
        ? 'New personal best. Saved.'
        : `Run saved. Your best is ${data.highScore}.`;

      const stored = API.getUser() || {};
      stored.highScore = data.highScore;
      stored.totalCoins = data.totalCoins;
      API.setSession(API.getToken(), stored);
    } catch (err) {
      els.saveNote.textContent = `Could not save: ${err.message}`;
    }
  }

  /* -------------------------------- kick off ------------------------------ */

  resetGame();
  draw();
  show(els.menu);
})();
