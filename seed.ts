import { db } from './src/db/index.ts';
import { modules, subjects, chapters, questions, quizzes } from './src/db/schema.ts';

async function seed() {
  const [mod] = await db.insert(modules).values({
    title: 'Anatomy Basics',
    description: 'Introduction to human anatomy.',
    price: 500
  }).returning();

  const [subj] = await db.insert(subjects).values({
    moduleId: mod.id,
    title: 'Upper Limb'
  }).returning();

  const [chap] = await db.insert(chapters).values({
    subjectId: subj.id,
    title: 'Shoulder Joint'
  }).returning();

  await db.insert(questions).values([
    {
      chapterId: chap.id,
      type: 'mcq',
      content: 'Which muscle is NOT part of the rotator cuff?',
      choices: ['Supraspinatus', 'Infraspinatus', 'Teres major', 'Subscapularis'],
      correctAnswer: 'Teres major',
      explanation: 'Teres major is not part of the rotator cuff. Rotator cuff is SITS: Supraspinatus, Infraspinatus, Teres minor, Subscapularis.'
    },
    {
      chapterId: chap.id,
      type: 'mcq',
      content: 'What nerve innervates the deltoid muscle?',
      choices: ['Axillary nerve', 'Radial nerve', 'Ulnar nerve', 'Median nerve'],
      correctAnswer: 'Axillary nerve',
      explanation: 'The axillary nerve innervates the deltoid and teres minor muscles.'
    }
  ]);

  await db.insert(quizzes).values({
    chapterId: chap.id,
    poolSize: 2,
    questionsPerAttempt: 2,
    mode: 'study',
  });

  console.log('Seeded successfully!');
  process.exit(0);
}

seed().catch(console.error);
