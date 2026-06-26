if (process.env.NODE_ENV !== 'production') require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const { getDb, nextId } = require('./db');
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

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
app.use(express.static(FRONTEND_DIR));

// ── AUTH ──────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are all required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const db = await getDb();
    const existing = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ error: 'An account with that email already exists.' });

    const id = await nextId(db, 'users');
    const newUser = {
      id, name, email: email.toLowerCase(),
      password: bcrypt.hashSync(password, 10),
      role: role === 'teacher' ? 'teacher' : (role === 'child' ? 'child' : 'parent'),
      coins: 0, status: 'active', created_at: new Date().toISOString()
    };
    await db.collection('users').insertOne(newUser);

    const token = signToken(newUser);
    const { password: _pw, _id, ...safeUser } = newUser;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const db = await getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Incorrect email or password.' });
    if (user.status === 'suspended')
      return res.status(403).json({ error: 'This account has been suspended.' });

    const token = signToken(user);
    const { password: _pw, _id, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', (req, res) => {
  res.json({ message: 'If an account exists for that email, a reset link has been sent.' });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password: _pw, _id, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC CONTENT ────────────────────────────────

app.get('/api/stories', async (req, res) => {
  try {
    const db = await getDb();
    const stories = await db.collection('stories').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ stories });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.get('/api/games', async (req, res) => {
  try {
    const db = await getDb();
    const games = await db.collection('games').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ games });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.get('/api/worksheets', async (req, res) => {
  try {
    const db = await getDb();
    const worksheets = await db.collection('worksheets').find({}, { projection: { _id: 0 } }).toArray();
    res.json({ worksheets });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings/public', async (req, res) => {
  try {
    const db = await getDb();
    const s = await db.collection('settings').findOne({ _id: 'main' });
    const { coins_per_story, coins_per_worksheet, coins_per_game, premium_monthly_price, family_monthly_price } = s;
    res.json({ settings: { coins_per_story, coins_per_worksheet, coins_per_game, premium_monthly_price, family_monthly_price } });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

// ── EARN COINS ────────────────────────────────────

app.post('/api/games/:id/play', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const game = await db.collection('games').findOne({ id: Number(req.params.id) });
    if (!game) return res.status(404).json({ error: 'Game not found.' });

    const s = await db.collection('settings').findOne({ _id: 'main' });
    const coinsEarned = s.coins_per_game;

    await db.collection('users').updateOne({ id: req.user.id }, { $inc: { coins: coinsEarned } });
    const pid = await nextId(db, 'progress');
    await db.collection('progress').insertOne({
      id: pid, user_id: req.user.id, type: 'game',
      item_id: game.id, coins_earned: coinsEarned, created_at: new Date().toISOString()
    });
    const user = await db.collection('users').findOne({ id: req.user.id });
    res.json({ message: `You earned ${coinsEarned} coins!`, coins_earned: coinsEarned, total_coins: user.coins });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.post('/api/stories/:id/read', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const story = await db.collection('stories').findOne({ id: Number(req.params.id) });
    if (!story) return res.status(404).json({ error: 'Story not found.' });

    await db.collection('stories').updateOne({ id: story.id }, { $inc: { reads: 1 } });
    const s = await db.collection('settings').findOne({ _id: 'main' });
    const coinsEarned = s.coins_per_story;

    await db.collection('users').updateOne({ id: req.user.id }, { $inc: { coins: coinsEarned } });
    const pid = await nextId(db, 'progress');
    await db.collection('progress').insertOne({
      id: pid, user_id: req.user.id, type: 'story',
      item_id: story.id, coins_earned: coinsEarned, created_at: new Date().toISOString()
    });
    const user = await db.collection('users').findOne({ id: req.user.id });
    res.json({ message: `Story complete! You earned ${coinsEarned} coins!`, coins_earned: coinsEarned, total_coins: user.coins });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.post('/api/worksheets/:id/download', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const worksheet = await db.collection('worksheets').findOne({ id: Number(req.params.id) });
    if (!worksheet) return res.status(404).json({ error: 'Worksheet not found.' });

    await db.collection('worksheets').updateOne({ id: worksheet.id }, { $inc: { downloads: 1 } });
    const s = await db.collection('settings').findOne({ _id: 'main' });
    const coinsEarned = s.coins_per_worksheet;

    await db.collection('users').updateOne({ id: req.user.id }, { $inc: { coins: coinsEarned } });
    const pid = await nextId(db, 'progress');
    await db.collection('progress').insertOne({
      id: pid, user_id: req.user.id, type: 'worksheet',
      item_id: worksheet.id, coins_earned: coinsEarned, created_at: new Date().toISOString()
    });
    const user = await db.collection('users').findOne({ id: req.user.id });
    res.json({ message: `You earned ${coinsEarned} coins!`, coins_earned: coinsEarned, total_coins: user.coins });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.get('/api/progress/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const progress = await db.collection('progress').find({ user_id: req.user.id }, { projection: { _id: 0 } }).toArray();
    const user = await db.collection('users').findOne({ id: req.user.id });
    res.json({ progress, total_coins: user ? user.coins : 0 });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscribe', requireAuth, async (req, res) => {
  try {
    const { plan } = req.body || {};
    if (!plan) return res.status(400).json({ error: 'Please choose a plan.' });
    const db = await getDb();
    await db.collection('users').updateOne({ id: req.user.id }, { $set: { plan } });
    res.json({ message: `You're now on the ${plan} plan!`, plan });
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

// ── ADMIN ─────────────────────────────────────────

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const [users, stories, games, worksheets, progress] = await Promise.all([
      db.collection('users').countDocuments(),
      db.collection('stories').countDocuments(),
      db.collection('games').countDocuments(),
      db.collection('worksheets').countDocuments(),
      db.collection('progress').find().toArray()
    ]);
    const storiesArr = await db.collection('stories').find().toArray();
    const worksheetsArr = await db.collection('worksheets').find().toArray();
    res.json({ stats: {
      total_users: users, total_stories: stories,
      total_games: games, total_worksheets: worksheets,
      total_story_reads: storiesArr.reduce((s, x) => s + (x.reads || 0), 0),
      total_worksheet_downloads: worksheetsArr.reduce((s, x) => s + (x.downloads || 0), 0),
      total_coins_awarded: progress.reduce((s, x) => s + (x.coins_earned || 0), 0)
    }});
  } catch (err) {
    console.error('API ERROR:', err.message); res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/stories', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const id = await nextId(db, 'stories');
    const story = { id, reads: 0, is_today: false, ...req.body };
    await db.collection('stories').insertOne(story);
    const { _id, ...clean } = story;
    res.json({ story: clean });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/stories/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('stories').updateOne({ id: Number(req.params.id) }, { $set: req.body });
    const story = await db.collection('stories').findOne({ id: Number(req.params.id) }, { projection: { _id: 0 } });
    res.json({ story });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/stories/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('stories').deleteOne({ id: Number(req.params.id) });
    res.json({ message: 'Story deleted.' });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/stories/:id/set-today', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('stories').updateMany({}, { $set: { is_today: false } });
    await db.collection('stories').updateOne({ id: Number(req.params.id) }, { $set: { is_today: true } });
    await db.collection('settings').updateOne({ _id: 'main' }, { $set: { daily_story_id: Number(req.params.id) } });
    const story = await db.collection('stories').findOne({ id: Number(req.params.id) }, { projection: { _id: 0 } });
    res.json({ story });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/games', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const id = await nextId(db, 'games');
    const game = { id, ...req.body };
    await db.collection('games').insertOne(game);
    const { _id, ...clean } = game;
    res.json({ game: clean });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/games/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('games').updateOne({ id: Number(req.params.id) }, { $set: req.body });
    const game = await db.collection('games').findOne({ id: Number(req.params.id) }, { projection: { _id: 0 } });
    res.json({ game });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/games/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('games').deleteOne({ id: Number(req.params.id) });
    res.json({ message: 'Game deleted.' });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/worksheets', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const id = await nextId(db, 'worksheets');
    const worksheet = { id, downloads: 0, ...req.body };
    await db.collection('worksheets').insertOne(worksheet);
    const { _id, ...clean } = worksheet;
    res.json({ worksheet: clean });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/worksheets/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('worksheets').updateOne({ id: Number(req.params.id) }, { $set: req.body });
    const worksheet = await db.collection('worksheets').findOne({ id: Number(req.params.id) }, { projection: { _id: 0 } });
    res.json({ worksheet });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/worksheets/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('worksheets').deleteOne({ id: Number(req.params.id) });
    res.json({ message: 'Worksheet deleted.' });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.collection('users').find({}, { projection: { _id: 0, password: 0 } }).toArray();
    res.json({ users });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['active', 'suspended'].includes(status))
      return res.status(400).json({ error: "Status must be 'active' or 'suspended'." });
    const db = await getDb();
    await db.collection('users').updateOne({ id: Number(req.params.id) }, { $set: { status } });
    const user = await db.collection('users').findOne({ id: Number(req.params.id) }, { projection: { _id: 0, password: 0 } });
    res.json({ user });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('users').deleteOne({ id: Number(req.params.id) });
    res.json({ message: 'User deleted.' });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    const settings = await db.collection('settings').findOne({ _id: 'main' });
    const { _id, ...clean } = settings;
    res.json({ settings: clean });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection('settings').updateOne({ _id: 'main' }, { $set: req.body });
    const settings = await db.collection('settings').findOne({ _id: 'main' });
    const { _id, ...clean } = settings;
    res.json({ settings: clean });
  } catch (err) { console.error('API ERROR:', err.message); res.status(500).json({ error: err.message }); }
});

// ── FALLBACK ──────────────────────────────────────

app.get('/admin', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'admin.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'admin.html')));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  FunSpot Quest server running on port ${PORT}\n`);
});
