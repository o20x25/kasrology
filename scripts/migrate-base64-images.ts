import { db } from '../src/db/index.ts';
import { modules, questions, paymentRequests } from '../src/db/schema.ts';
import { saveBase64Image } from '../src/lib/image-storage.ts';
import { eq, like } from 'drizzle-orm';

async function runMigration() {
  console.log('Starting Base64 image migration...');

  // 1. Modules
  const base64Modules = await db.select().from(modules).where(like(modules.imageUrl, 'data:%'));
  console.log(`Found ${base64Modules.length} module(s) with base64 images.`);

  for (const mod of base64Modules) {
    if (mod.imageUrl && mod.imageUrl.startsWith('data:')) {
      const originalLength = mod.imageUrl.length;
      const fileUrl = saveBase64Image(mod.imageUrl, `module_${mod.id}`);
      await db.update(modules).set({ imageUrl: fileUrl }).where(eq(modules.id, mod.id));
      console.log(`Migrated Module [${mod.id}] "${mod.title}": saved ${originalLength} bytes -> ${fileUrl}`);
    }
  }

  // 2. Questions
  const base64Questions = await db.select().from(questions).where(like(questions.imageUrl, 'data:%'));
  console.log(`Found ${base64Questions.length} question(s) with base64 images.`);

  for (const q of base64Questions) {
    if (q.imageUrl && q.imageUrl.startsWith('data:')) {
      const fileUrl = saveBase64Image(q.imageUrl, `question_${q.id}`);
      await db.update(questions).set({ imageUrl: fileUrl }).where(eq(questions.id, q.id));
      console.log(`Migrated Question [${q.id}]: saved ${q.imageUrl.length} bytes -> ${fileUrl}`);
    }
  }

  // 3. Payment Requests
  const base64Payments = await db.select().from(paymentRequests).where(like(paymentRequests.screenshotUrl, 'data:%'));
  console.log(`Found ${base64Payments.length} payment request(s) with base64 images.`);

  for (const p of base64Payments) {
    if (p.screenshotUrl && p.screenshotUrl.startsWith('data:')) {
      const fileUrl = saveBase64Image(p.screenshotUrl, `payment_${p.id}`);
      await db.update(paymentRequests).set({ screenshotUrl: fileUrl }).where(eq(paymentRequests.id, p.id));
      console.log(`Migrated Payment [${p.id}]: saved ${p.screenshotUrl.length} bytes -> ${fileUrl}`);
    }
  }

  console.log('Base64 migration completed successfully!');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
