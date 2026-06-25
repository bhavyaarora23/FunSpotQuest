if (process.env.NODE_ENV !== 'production') require('dotenv').config();


const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const { readDb, writeDb } = require('./db');
const { signToken, requireAuth, requireAdmin } = require('./auth');

const app = express();
const PORT = process.env.PORT;

app.use(cors({
  origin: [
    'https://funspotquest.netlify.app',
    'https://funspotquestadmin.netlify.app',
    'http://localhost:4000',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

// ───────────────────────────────────────────────
// Serve the frontend (the actual website + admin panel)
// ───────────────────────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// ═════════════════════════════════════════════════
// AUTH
// ═════════════════════════════════════════════════

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are all required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const db = readDb();
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }

  const newUser = {
    id: db.nextIds.users++,
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    role: role === 'teacher' ? 'teacher' : (role === 'child' ? 'child' : 'parent'),
    coins: 0,
    status: 'active',
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  writeDb(db);

  const token = signToken(newUser);
  const { password: _pw, ...safeUser } = newUser;
  res.json({ token, user: safeUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const db = readDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'This account has been suspended.' });
  }

  const token = signToken(user);
  const { password: _pw, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'Please provide an email address.' });
  }
  // No real email service is wired up yet — this simply acknowledges the request
  // so the frontend's "reset link sent" flow works. Hook up a real email
  // provider here (e.g. SendGrid, Postmark) when you're ready to go live.
  res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { password: _pw, ...safeUser } = user;
  res.json({ user: safeUser });
});

// ═════════════════════════════════════════════════
// PUBLIC CONTENT
// ═════════════════════════════════════════════════

app.get('/api/stories', (req, res) => {
  const db = readDb();
  res.json({ stories: db.stories });
});

app.get('/api/games', (req, res) => {
  const db = readDb();
  res.json({ games: db.games });
});

app.get('/api/worksheets', (req, res) => {
  const db = readDb();
  res.json({ worksheets: db.worksheets });
});

app.get('/api/settings/public', (req, res) => {
  const db = readDb();
  const { coins_per_story, coins_per_worksheet, coins_per_game, premium_monthly_price, family_monthly_price } = db.settings;
  res.json({ settings: { coins_per_story, coins_per_worksheet, coins_per_game, premium_monthly_price, family_monthly_price } });
});

// ═════════════════════════════════════════════════
// PLAY / READ / DOWNLOAD (earn coins, logged-in users only)
// ═════════════════════════════════════════════════

app.post('/api/games/:id/play', requireAuth, (req, res) => {
  const db = readDb();
  const game = db.games.find(g => g.id === Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game not found.' });

  const user = db.users.find(u => u.id === req.user.id);
  const coinsEarned = db.settings.coins_per_game;
  user.coins += coinsEarned;

  db.progress.push({
    id: db.nextIds.progress++,
    user_id: user.id,
    type: 'game',
    item_id: game.id,
    coins_earned: coinsEarned,
    created_at: new Date().toISOString()
  });
  writeDb(db);

  res.json({ message: `You earned ${coinsEarned} coins! 🪙`, coins_earned: coinsEarned, total_coins: user.coins });
});

app.post('/api/stories/:id/read', requireAuth, (req, res) => {
  const db = readDb();
  const story = db.stories.find(s => s.id === Number(req.params.id));
  if (!story) return res.status(404).json({ error: 'Story not found.' });

  story.reads = (story.reads || 0) + 1;

  const user = db.users.find(u => u.id === req.user.id);
  const coinsEarned = db.settings.coins_per_story;
  user.coins += coinsEarned;

  db.progress.push({
    id: db.nextIds.progress++,
    user_id: user.id,
    type: 'story',
    item_id: story.id,
    coins_earned: coinsEarned,
    created_at: new Date().toISOString()
  });
  writeDb(db);

  res.json({ message: `Story complete! You earned ${coinsEarned} coins! 🪙`, coins_earned: coinsEarned, total_coins: user.coins });
});

app.post('/api/worksheets/:id/download', requireAuth, (req, res) => {
  const db = readDb();
  const worksheet = db.worksheets.find(w => w.id === Number(req.params.id));
  if (!worksheet) return res.status(404).json({ error: 'Worksheet not found.' });

  worksheet.downloads = (worksheet.downloads || 0) + 1;

  const user = db.users.find(u => u.id === req.user.id);
  const coinsEarned = db.settings.coins_per_worksheet;
  user.coins += coinsEarned;

  db.progress.push({
    id: db.nextIds.progress++,
    user_id: user.id,
    type: 'worksheet',
    item_id: worksheet.id,
    coins_earned: coinsEarned,
    created_at: new Date().toISOString()
  });
  writeDb(db);

  res.json({ message: `You earned ${coinsEarned} coins! 🪙`, coins_earned: coinsEarned, total_coins: user.coins });
});

app.get('/api/progress/me', requireAuth, (req, res) => {
  const db = readDb();
  const myProgress = db.progress.filter(p => p.user_id === req.user.id);
  const user = db.users.find(u => u.id === req.user.id);
  res.json({ progress: myProgress, total_coins: user ? user.coins : 0 });
});

// ═════════════════════════════════════════════════
// SUBSCRIPTION (records a plan choice — no real payment gateway wired up yet)
// ═════════════════════════════════════════════════

app.post('/api/subscribe', requireAuth, (req, res) => {
  const { plan } = req.body || {};
  if (!plan) return res.status(400).json({ error: 'Please choose a plan.' });

  const db = readDb();
  const user = db.users.find(u => u.id === req.user.id);
  user.plan = plan;
  writeDb(db);

  // NOTE for future you: to accept real payments, integrate Stripe or Razorpay
  // here before marking the subscription active.
  res.json({ message: `You're now on the ${plan} plan!`, plan });
});

// ═════════════════════════════════════════════════
// ADMIN
// ═════════════════════════════════════════════════

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({
    stats: {
      total_users: db.users.length,
      total_stories: db.stories.length,
      total_games: db.games.length,
      total_worksheets: db.worksheets.length,
      total_story_reads: db.stories.reduce((sum, s) => sum + (s.reads || 0), 0),
      total_worksheet_downloads: db.worksheets.reduce((sum, w) => sum + (w.downloads || 0), 0),
      total_coins_awarded: db.progress.reduce((sum, p) => sum + (p.coins_earned || 0), 0)
    }
  });
});

// --- Stories CRUD ---
app.post('/api/admin/stories', requireAdmin, (req, res) => {
  const db = readDb();
  const story = { id: db.nextIds.stories++, reads: 0, is_today: false, ...req.body };
  db.stories.push(story);
  writeDb(db);
  res.json({ story });
});

app.put('/api/admin/stories/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const story = db.stories.find(s => s.id === Number(req.params.id));
  if (!story) return res.status(404).json({ error: 'Story not found.' });
  Object.assign(story, req.body);
  writeDb(db);
  res.json({ story });
});

app.delete('/api/admin/stories/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.stories = db.stories.filter(s => s.id !== Number(req.params.id));
  writeDb(db);
  res.json({ message: 'Story deleted.' });
});

app.post('/api/admin/stories/:id/set-today', requireAdmin, (req, res) => {
  const db = readDb();
  db.stories.forEach(s => { s.is_today = false; });
  const story = db.stories.find(s => s.id === Number(req.params.id));
  if (!story) return res.status(404).json({ error: 'Story not found.' });
  story.is_today = true;
  db.settings.daily_story_id = story.id;
  writeDb(db);
  res.json({ story });
});

// --- Games CRUD ---
app.post('/api/admin/games', requireAdmin, (req, res) => {
  const db = readDb();
  const game = { id: db.nextIds.games++, ...req.body };
  db.games.push(game);
  writeDb(db);
  res.json({ game });
});

app.put('/api/admin/games/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const game = db.games.find(g => g.id === Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Game not found.' });
  Object.assign(game, req.body);
  writeDb(db);
  res.json({ game });
});

app.delete('/api/admin/games/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.games = db.games.filter(g => g.id !== Number(req.params.id));
  writeDb(db);
  res.json({ message: 'Game deleted.' });
});

// --- Worksheets CRUD ---
app.post('/api/admin/worksheets', requireAdmin, (req, res) => {
  const db = readDb();
  const worksheet = { id: db.nextIds.worksheets++, downloads: 0, ...req.body };
  db.worksheets.push(worksheet);
  writeDb(db);
  res.json({ worksheet });
});

app.put('/api/admin/worksheets/:id', requireAdmin, (req, res) => {
  const db = readDb();
  const worksheet = db.worksheets.find(w => w.id === Number(req.params.id));
  if (!worksheet) return res.status(404).json({ error: 'Worksheet not found.' });
  Object.assign(worksheet, req.body);
  writeDb(db);
  res.json({ worksheet });
});

app.delete('/api/admin/worksheets/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.worksheets = db.worksheets.filter(w => w.id !== Number(req.params.id));
  writeDb(db);
  res.json({ message: 'Worksheet deleted.' });
});

// --- Users management ---
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const db = readDb();
  const safeUsers = db.users.map(({ password, ...rest }) => rest);
  res.json({ users: safeUsers });
});

app.put('/api/admin/users/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'active' or 'suspended'." });
  }
  const db = readDb();
  const user = db.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found.' });
  user.status = status;
  writeDb(db);
  const { password: _pw, ...safeUser } = user;
  res.json({ user: safeUser });
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const db = readDb();
  db.users = db.users.filter(u => u.id !== Number(req.params.id));
  writeDb(db);
  res.json({ message: 'User deleted.' });
});

// --- Settings ---
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  const db = readDb();
  res.json({ settings: db.settings });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const db = readDb();
  Object.assign(db.settings, req.body);
  writeDb(db);
  res.json({ settings: db.settings });
});

// ═════════════════════════════════════════════════
// FALLBACK — serve the right HTML page for any non-API route
// ═════════════════════════════════════════════════
app.get('/admin', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});
app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'admin.html'));
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('  🎉 FunSpot Quest server is running!');
  console.log('  ────────────────────────────────────');
  console.log(`  Website:     http://localhost:${PORT}`);
  console.log(`  Admin panel: http://localhost:${PORT}/admin`);
  console.log('');
  console.log('  Admin login: admin@funspotquest.com / admin123');
  console.log('  (Please change this password once you\'re live!)');
  console.log('');
});
