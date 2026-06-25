// backend/db.js
// Simple JSON-file "database" for FunSpot Quest.
// No external database software needed — everything lives in backend/data/db.json,
// which is created automatically the first time the server runs.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function seedData() {
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);

  return {
    nextIds: { users: 2, stories: 13, games: 9, worksheets: 9, progress: 1 },
    users: [
      {
        id: 1,
        name: 'Admin',
        email: 'admin@funspotquest.com',
        password: adminPasswordHash,
        role: 'admin',
        coins: 0,
        status: 'active',
        created_at: new Date().toISOString()
      }
    ],
    stories: [
      { id: 1, emoji: '💎', title: 'The Crystal Cave Twins', category: 'Adventure', type: 'premium', reads: 198, is_today: false, excerpt: "Deep in the mountains there was a cave glittering with crystals. The twins Aanya and Aarav stepped inside..." },
      { id: 2, emoji: '⚙️', title: 'Why The Sky Is Blue', category: 'Science', type: 'premium', reads: 0, is_today: false, excerpt: "A curious boy wondered why the sky was blue. He asked the sun, the..." },
      { id: 3, emoji: '🐰', title: 'The Honest Rabbit', category: 'Moral', type: 'free', reads: 2, is_today: true, excerpt: "Riko the rabbit found a basket of carrots that wasn't his. He could have kept them all..." },
      { id: 4, emoji: '🦁', title: 'The Gentle Lion King', category: 'Adventure', type: 'premium', reads: 0, is_today: false, excerpt: "He looked fierce but he had the biggest heart. When a baby zebra..." },
      { id: 5, emoji: '🌙', title: 'The Moon\u2019s Lullaby', category: 'Bedtime', type: 'free', reads: 41, is_today: false, excerpt: "Every night the moon hums a quiet song to children who are falling asleep..." },
      { id: 6, emoji: '🐢', title: 'Slow and Steady Wins', category: 'Moral', type: 'free', reads: 87, is_today: false, excerpt: "A speedy hare challenged a slow tortoise to a race, sure he would win..." },
      { id: 7, emoji: '🚀', title: 'Mission to Mars', category: 'Science', type: 'premium', reads: 12, is_today: false, excerpt: "Captain Maya strapped into her seat as the rocket counted down to launch..." },
      { id: 8, emoji: '🧚', title: 'The Garden Fairy\u2019s Secret', category: 'Adventure', type: 'free', reads: 56, is_today: false, excerpt: "Hidden behind the roses lived a tiny fairy who watered the flowers at night..." },
      { id: 9, emoji: '🐶', title: 'Buddy Finds a Friend', category: 'Moral', type: 'free', reads: 73, is_today: false, excerpt: "Buddy the puppy was lonely until he met a kitten who needed help..." },
      { id: 10, emoji: '❄️', title: 'The Snowman\u2019s Wish', category: 'Bedtime', type: 'premium', reads: 5, is_today: false, excerpt: "Every winter the snowman wished he could see the summer flowers bloom..." },
      { id: 11, emoji: '🦋', title: 'A Caterpillar\u2019s Big Day', category: 'Science', type: 'free', reads: 29, is_today: false, excerpt: "Coco the caterpillar felt sleepy and curled up into a cozy cocoon..." },
      { id: 12, emoji: '🏰', title: 'The Kind Knight', category: 'Adventure', type: 'premium', reads: 8, is_today: false, excerpt: "Sir Tomas never fought unless it was to protect someone weaker than him..." }
    ],
    games: [
      { id: 1, emoji: '🧠', title: 'Memory Match', category: 'Brain', type: 'free', description: 'Flip cards and match the pairs as fast as you can!', slug: 'memory-match' },
      { id: 2, emoji: '➕', title: 'Number Ninja', category: 'Math', type: 'free', description: 'Slice through math problems before time runs out.', slug: 'number-ninja' },
      { id: 3, emoji: '🔤', title: 'Word Builder', category: 'English', type: 'premium', description: 'Build as many words as you can from the letters shown.', slug: 'word-builder' },
      { id: 4, emoji: '🧩', title: 'Shape Sorter', category: 'Logic', type: 'free', description: 'Sort shapes into the right buckets before the clock runs out.', slug: 'shape-sorter' },
      { id: 5, emoji: '🎨', title: 'Color Splash', category: 'Art', type: 'free', description: 'Mix colors and complete fun pixel-art pictures.', slug: 'color-splash' },
      { id: 6, emoji: '🧮', title: 'Speedy Sums', category: 'Math', type: 'premium', description: 'Answer as many sums as you can before time runs out.', slug: 'speedy-sums' },
      { id: 7, emoji: '🦉', title: 'Riddle Owl', category: 'Logic', type: 'premium', description: 'Solve riddles to help the wise owl unlock new puzzles.', slug: 'riddle-owl' },
      { id: 8, emoji: '✨', title: 'More Games', category: 'Brain', type: 'free', description: 'New games are coming soon!', slug: 'coming-soon' }
    ],
    worksheets: [
      { id: 1, emoji: '✖️', title: 'Multiplication Practice', subject: 'Math', grade: 'Grade 3', type: 'free', description: 'Practice times tables from 2 to 10 with fun exercises.', downloads: 312 },
      { id: 2, emoji: '📖', title: 'Reading Comprehension Pack', subject: 'English', grade: 'Grade 2', type: 'free', description: 'Short passages with questions to test understanding.', downloads: 198 },
      { id: 3, emoji: '🔬', title: 'States of Matter', subject: 'Science', grade: 'Grade 4', type: 'premium', description: 'Learn about solids, liquids, and gases with activities.', downloads: 87 },
      { id: 4, emoji: '✍️', title: 'Cursive Handwriting Sheets', subject: 'English', grade: 'Grade 1', type: 'free', description: 'Trace and practice cursive letters from A to Z.', downloads: 256 },
      { id: 5, emoji: '🌍', title: 'World Map Coloring', subject: 'Geography', grade: 'Grade 3', type: 'free', description: 'Color and label the seven continents.', downloads: 134 },
      { id: 6, emoji: '🧪', title: 'Fun with Fractions', subject: 'Math', grade: 'Grade 4', type: 'premium', description: 'Visual exercises to understand fractions easily.', downloads: 102 },
      { id: 7, emoji: '🐾', title: 'Animal Habitats Quiz', subject: 'Science', grade: 'Grade 2', type: 'free', description: 'Match animals to their natural habitats.', downloads: 165 },
      { id: 8, emoji: '🖋️', title: 'Creative Story Starters', subject: 'English', grade: 'Grade 5', type: 'premium', description: 'Story prompts to spark imaginative writing.', downloads: 76 }
    ],
    progress: [],
    settings: {
      coins_per_story: 10,
      coins_per_worksheet: 15,
      coins_per_game: 5,
      premium_monthly_price: 4.99,
      family_monthly_price: 7.99,
      daily_story_id: 3
    }
  };
}

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seedData(), null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_FILE, 'utf8');
  return JSON.parse(raw);
}

function writeDb(data) {
  // Atomic write: write to a temp file then rename, so a crash mid-write
  // can never corrupt the real database file.
  const tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

module.exports = { readDb, writeDb, ensureDb };
