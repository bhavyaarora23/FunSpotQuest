content = '''const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI;
let client;
let _db;

async function getDb() {
  if (_db) return _db;
  if (!uri) throw new Error('MONGODB_URI environment variable is not set!');

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  _db = client.db('funspotquest');
  console.log('MongoDB connected successfully!');

  await seedIfEmpty(_db);
  return _db;
}

async function seedIfEmpty(db) {
  const count = await db.collection('users').countDocuments();
  console.log('Existing user count:', count);
  if (count > 0) return;

  console.log('Seeding fresh database...');
  const adminPassword = bcrypt.hashSync('admin123', 10);

  await db.collection('users').insertOne({
    id: 1, name: 'Admin', email: 'admin@funspotquest.com',
    password: adminPassword, role: 'admin', coins: 0,
    status: 'active', created_at: new Date().toISOString()
  });

  await db.collection('stories').insertMany([
    { id: 1, emoji: '💎', title: 'The Crystal Cave Twins', category: 'Adventure', type: 'premium', reads: 198, is_today: false, excerpt: 'Deep in the mountains there was a cave glittering with crystals...' },
    { id: 2, emoji: '⚙️', title: 'Why The Sky Is Blue', category: 'Science', type: 'premium', reads: 0, is_today: false, excerpt: 'A curious boy wondered why the sky was blue. He asked the sun, the...' },
    { id: 3, emoji: '🐰', title: 'The Honest Rabbit', category: 'Moral', type: 'free', reads: 2, is_today: true, excerpt: "Riko the rabbit found a basket of carrots that wasn't his..." },
    { id: 4, emoji: '🦁', title: 'The Gentle Lion King', category: 'Adventure', type: 'premium', reads: 0, is_today: false, excerpt: 'He looked fierce but he had the biggest heart. When a baby zebra...' },
    { id: 5, emoji: '🌙', title: "The Moon's Lullaby", category: 'Bedtime', type: 'free', reads: 41, is_today: false, excerpt: 'Every night the moon hums a quiet song to children who are falling asleep...' },
    { id: 6, emoji: '🐢', title: 'Slow and Steady Wins', category: 'Moral', type: 'free', reads: 87, is_today: false, excerpt: 'A speedy hare challenged a slow tortoise to a race...' },
    { id: 7, emoji: '🚀', title: 'Mission to Mars', category: 'Science', type: 'premium', reads: 12, is_today: false, excerpt: 'Captain Maya strapped into her seat as the rocket counted down...' },
    { id: 8, emoji: '🧚', title: "The Garden Fairy's Secret", category: 'Adventure', type: 'free', reads: 56, is_today: false, excerpt: 'Hidden behind the roses lived a tiny fairy who watered the flowers...' },
    { id: 9, emoji: '🐶', title: 'Buddy Finds a Friend', category: 'Moral', type: 'free', reads: 73, is_today: false, excerpt: 'Buddy the puppy was lonely until he met a kitten who needed help...' },
    { id: 10, emoji: '❄️', title: "The Snowman's Wish", category: 'Bedtime', type: 'premium', reads: 5, is_today: false, excerpt: 'Every winter the snowman wished he could see the summer flowers bloom...' },
    { id: 11, emoji: '🦋', title: "A Caterpillar's Big Day", category: 'Science', type: 'free', reads: 29, is_today: false, excerpt: 'Coco the caterpillar felt sleepy and curled up into a cozy cocoon...' },
    { id: 12, emoji: '🏰', title: 'The Kind Knight', category: 'Adventure', type: 'premium', reads: 8, is_today: false, excerpt: 'Sir Tomas never fought unless it was to protect someone weaker than him...' }
  ]);

  await db.collection('games').insertMany([
    { id: 1, emoji: '🧠', title: 'Memory Match', category: 'Brain', type: 'free', description: 'Flip cards and match the pairs as fast as you can!', slug: 'memory-match' },
    { id: 2, emoji: '➕', title: 'Number Ninja', category: 'Math', type: 'free', description: 'Slice through math problems before time runs out.', slug: 'number-ninja' },
    { id: 3, emoji: '🔤', title: 'Word Builder', category: 'English', type: 'premium', description: 'Build as many words as you can from the letters shown.', slug: 'word-builder' },
    { id: 4, emoji: '🧩', title: 'Shape Sorter', category: 'Logic', type: 'free', description: 'Sort shapes into the right buckets before the clock runs out.', slug: 'shape-sorter' },
    { id: 5, emoji: '🌍', title: 'Geography Quest', category: 'GK', type: 'premium', description: 'Identify countries, capitals and flags from around the world.', slug: 'geography-quest' },
    { id: 6, emoji: '🔬', title: 'Science Lab', category: 'Science', type: 'premium', description: 'Mix virtual chemicals and discover what reactions you can make.', slug: 'science-lab' },
    { id: 7, emoji: '🎨', title: 'Color Mixer', category: 'Art', type: 'free', description: 'Mix primary colors to match the target shade shown.', slug: 'color-mixer' },
    { id: 8, emoji: '⏱️', title: 'Speed Maths', category: 'Math', type: 'free', description: 'Answer as many sums as possible before the timer runs out.', slug: 'speed-maths' }
  ]);

  await db.collection('worksheets').insertMany([
    { id: 1, emoji: '✖️', title: 'Multiplication Practice', subject: 'Math', grade: 'Grade 3', type: 'free', description: 'Practice times tables from 2 to 10.', downloads: 312 },
    { id: 2, emoji: '📖', title: 'Reading Comprehension', subject: 'English', grade: 'Grade 4', type: 'free', description: 'Read a short story then answer questions about it.', downloads: 198 },
    { id: 3, emoji: '🗺️', title: 'Map Skills', subject: 'Geography', grade: 'Grade 5', type: 'premium', description: 'Learn to read maps, scales and compass directions.', downloads: 145 },
    { id: 4, emoji: '🔭', title: 'Solar System Facts', subject: 'Science', grade: 'Grade 4', type: 'free', description: 'Fill in facts about each planet in our solar system.', downloads: 276 },
    { id: 5, emoji: '✏️', title: 'Cursive Handwriting', subject: 'English', grade: 'Grade 2', type: 'free', description: 'Trace and practice all 26 letters in cursive script.', downloads: 189 },
    { id: 6, emoji: '🔢', title: 'Fractions Grade 4', subject: 'Math', grade: 'Grade 4', type: 'premium', description: 'Add, subtract and compare fractions.', downloads: 167 },
    { id: 7, emoji: '🌱', title: 'Plant Life Cycle', subject: 'Science', grade: 'Grade 3', type: 'free', description: 'Label the stages of a plant life cycle.', downloads: 134 },
    { id: 8, emoji: '🏛️', title: 'Ancient Civilisations', subject: 'History', grade: 'Grade 5', type: 'premium', description: 'Explore Egypt, Rome and Greece.', downloads: 211 }
  ]);

  await db.collection('settings').insertOne({
    _id: 'main', coins_per_story: 10, coins_per_worksheet: 15,
    coins_per_game: 5, premium_monthly_price: 299,
    family_monthly_price: 499, daily_story_id: 3
  });

  await db.collection('counters').insertOne({
    _id: 'main', users: 2, stories: 13, games: 9, worksheets: 9, progress: 1
  });

  console.log('Database seeded successfully!');
}

async function nextId(db, field) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: 'main' },
    { $inc: { [field]: 1 } },
    { returnDocument: 'before' }
  );
  return result[field];
}

module.exports = { getDb, nextId };
'''

with open('backend/db.js', 'w') as f:
    f.write(content)
print('Written successfully!')
