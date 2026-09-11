import { db } from './src/db/index.ts';
import { attempts, attemptAnswers, mistakes, questions } from './src/db/schema.ts';
import { eq, and } from 'drizzle-orm';

async function testSubmit() {
  try {
    const attemptId = 1; // Change this to a valid attempt ID or query the latest one
    const latestAttempt = await db.select().from(attempts).orderBy(attempts.id).limit(1);
    
    if (latestAttempt.length === 0) {
      console.log('No attempts found');
      return;
    }
    
    const attempt = latestAttempt[0];
    const qIds = attempt.questionIds as number[];
    console.log('Attempt question IDs:', qIds);

    const questionsData = await db.select().from(questions);
    
    let correctCount = 0;
    
    for (const qId of qIds) {
      console.log('Processing qId:', qId, typeof qId);
      const studentAns = 'Wrong Answer';
      const q = questionsData.find(x => x.id === qId);
      if (!q) {
        console.log('Question not found:', qId);
        continue;
      }
      
      const isCorrect = studentAns === q.correctAnswer;
      if (isCorrect) correctCount++;
      
      // Update answer
      await db.update(attemptAnswers)
        .set({ studentAnswer: studentAns || null, isCorrect })
        .where(and(eq(attemptAnswers.attemptId, attempt.id), eq(attemptAnswers.questionId, qId)));
        
      // Handle mistakes
      if (!isCorrect) {
        try {
          const existingMistake = await db.select().from(mistakes).where(and(eq(mistakes.studentId, attempt.studentId), eq(mistakes.questionId, qId)));
          if (existingMistake.length === 0) {
            await db.insert(mistakes).values({
              studentId: attempt.studentId,
              questionId: qId
            });
          }
        } catch (mistakeErr) {
          console.error('Failed to insert mistake:', mistakeErr);
        }
      }
    }
    
    const score = Math.round((correctCount / qIds.length) * 100);
    
    const finalAttempt = await db.update(attempts)
      .set({ status: 'submitted', submittedAt: new Date(), score })
      .where(eq(attempts.id, attempt.id))
      .returning();
      
    console.log('Success:', finalAttempt[0]);
  } catch (error: any) {
    console.error('SUBMIT QUIZ ERROR:', error.message);
    console.error(error.stack);
  }
}

testSubmit().catch(console.error).finally(() => process.exit(0));
