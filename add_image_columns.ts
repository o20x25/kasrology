import { db } from './src/db/index.ts';

async function runMigrations() {
  try {
    await db.execute('ALTER TABLE modules ADD COLUMN image_url text;');
    console.log('Added image_url to modules');
  } catch (e) {
    console.log('modules.image_url might already exist:', e.message);
  }

  try {
    await db.execute('ALTER TABLE questions ADD COLUMN image_url text;');
    console.log('Added image_url to questions');
  } catch (e) {
    console.log('questions.image_url might already exist:', e.message);
  }
}

runMigrations().then(() => process.exit(0));
