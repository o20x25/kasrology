import { Router } from 'express';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.ts';
import { db } from '../db/index.ts';
import { 
  users, 
  modules, 
  subjects, 
  chapters, 
  questions, 
  quizzes, 
  subscriptions,
  paymentRequests,
  paymentMethods,
  inviteCodes,
  attempts,
  attemptAnswers,
  mistakes,
  folderQuestions
} from '../db/schema.ts';
import { eq, inArray, asc, desc } from 'drizzle-orm';
import { saveBase64Image } from '../lib/image-storage.ts';

export const adminRouter = Router();

// Secure all admin routes
adminRouter.use(requireAuth, requireAdmin);

// Hierarchy (For quick content management UI)
adminRouter.get('/hierarchy', async (req, res) => {
  const mods = await db.select().from(modules);
  const subs = await db.select().from(subjects);
  const chaps = await db.select().from(chapters);
  res.json({ modules: mods, subjects: subs, chapters: chaps });
});

// User Management
adminRouter.get('/users', async (req, res) => {
  const allUsers = await db.select().from(users);
  
  // Get active subscriptions with module details
  const activeSubs = await db.select({
    id: subscriptions.id,
    studentId: subscriptions.studentId,
    moduleId: subscriptions.moduleId,
    moduleTitle: modules.title,
    expiryDate: subscriptions.expiryDate
  })
  .from(subscriptions)
  .innerJoin(modules, eq(subscriptions.moduleId, modules.id))
  .where(eq(subscriptions.status, 'active'));

  // Attach subscriptions to each user
  const usersWithSubs = allUsers.map(u => ({
    ...u,
    subscriptions: activeSubs.filter(s => s.studentId === u.id)
  }));

  res.json(usersWithSubs);
});

adminRouter.post('/users/:id/promote', async (req: AuthRequest, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    console.log(`[ADMIN API] Promoting user ID: ${targetId} by admin: ${req.dbUser?.email || req.user?.email}`);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    const updated = await db.update(users).set({ role: 'admin' }).where(eq(users.id, targetId)).returning();
    if (updated.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`[ADMIN API] Successfully promoted user ID ${targetId} (${updated[0].email}) to admin`);
    res.json({ success: true, user: updated[0] });
  } catch (error: any) {
    console.error('[ADMIN API ERROR] Failed to promote user:', error);
    res.status(500).json({ error: error.message || 'Failed to promote user' });
  }
});

adminRouter.post('/users/:id/demote', async (req: AuthRequest, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    console.log(`[ADMIN API] Demoting user ID: ${targetId} by admin: ${req.dbUser?.email || req.user?.email}`);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    // Prevent demoting master admin
    const targetUsers = await db.select().from(users).where(eq(users.id, targetId));
    if (targetUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (targetUsers[0].email === 'o.20x25@gmail.com') {
      return res.status(400).json({ error: 'Cannot demote the primary administrator.' });
    }
    const updated = await db.update(users).set({ role: 'student' }).where(eq(users.id, targetId)).returning();
    console.log(`[ADMIN API] Successfully demoted user ID ${targetId} (${updated[0].email}) to student`);
    res.json({ success: true, user: updated[0] });
  } catch (error: any) {
    console.error('[ADMIN API ERROR] Failed to demote user:', error);
    res.status(500).json({ error: error.message || 'Failed to demote user' });
  }
});

adminRouter.post('/users/:id/enroll', async (req, res) => {
  try {
    const studentId = parseInt(req.params.id);
    const { moduleId } = req.body;
    
    // Get module to check duration
    const mods = await db.select().from(modules).where(eq(modules.id, moduleId));
    if (mods.length === 0) return res.status(404).json({ error: 'Module not found' });
    const mod = mods[0];

    // Calculate expiry date if fixed duration
    let expiryDate: Date | null = null;
    if (mod.durationType === 'fixed' && mod.durationDays) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + mod.durationDays);
    }

    // Create subscription
    await db.insert(subscriptions).values({
      studentId,
      moduleId,
      status: 'active',
      expiryDate
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Failed to enroll student' });
  }
});

// Modules
adminRouter.post('/modules', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.imageUrl && data.imageUrl.startsWith('data:')) {
      data.imageUrl = saveBase64Image(data.imageUrl, 'module');
    }
    const result = await db.insert(modules).values(data).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to add module' });
  }
});
adminRouter.put('/modules/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.imageUrl && data.imageUrl.startsWith('data:')) {
      data.imageUrl = saveBase64Image(data.imageUrl, 'module');
    }
    const result = await db.update(modules).set(data).where(eq(modules.id, parseInt(req.params.id))).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to edit module' });
  }
});
adminRouter.delete('/modules/:id', async (req: AuthRequest, res) => {
  const moduleId = parseInt(req.params.id, 10);
  console.log(`[ADMIN API DELETE MODULE] Request to delete module ID: ${moduleId}`);
  if (isNaN(moduleId)) {
    return res.status(400).json({ error: 'Invalid module ID' });
  }

  try {
    // 1. Find all subjects belonging to this module
    const subList = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.moduleId, moduleId));
    const subIds = subList.map(s => s.id);

    if (subIds.length > 0) {
      // 2. Find all chapters belonging to these subjects
      const chapList = await db.select({ id: chapters.id }).from(chapters).where(inArray(chapters.subjectId, subIds));
      const chapIds = chapList.map(c => c.id);

      if (chapIds.length > 0) {
        // 3. Find all questions belonging to these chapters
        const qList = await db.select({ id: questions.id }).from(questions).where(inArray(questions.chapterId, chapIds));
        const qIds = qList.map(q => q.id);

        if (qIds.length > 0) {
          // Delete question associations
          await db.delete(mistakes).where(inArray(mistakes.questionId, qIds));
          await db.delete(folderQuestions).where(inArray(folderQuestions.questionId, qIds));
          await db.delete(attemptAnswers).where(inArray(attemptAnswers.questionId, qIds));
          await db.delete(questions).where(inArray(questions.id, qIds));
        }

        // 4. Find all quizzes belonging to these chapters
        const quizList = await db.select({ id: quizzes.id }).from(quizzes).where(inArray(quizzes.chapterId, chapIds));
        const quizIds = quizList.map(qz => qz.id);

        if (quizIds.length > 0) {
          // Delete attempt answers and attempts
          const attList = await db.select({ id: attempts.id }).from(attempts).where(inArray(attempts.quizId, quizIds));
          const attIds = attList.map(a => a.id);
          if (attIds.length > 0) {
            await db.delete(attemptAnswers).where(inArray(attemptAnswers.attemptId, attIds));
            await db.delete(attempts).where(inArray(attempts.id, attIds));
          }
          await db.delete(quizzes).where(inArray(quizzes.id, quizIds));
        }

        // Delete chapters
        await db.delete(chapters).where(inArray(chapters.id, chapIds));
      }

      // Delete subjects
      await db.delete(subjects).where(inArray(subjects.id, subIds));
    }

    // 5. Delete direct module relationships: subscriptions, payment requests, invite codes
    await db.delete(subscriptions).where(eq(subscriptions.moduleId, moduleId));
    await db.delete(paymentRequests).where(eq(paymentRequests.moduleId, moduleId));
    await db.delete(inviteCodes).where(eq(inviteCodes.moduleId, moduleId));

    // 6. Delete module itself
    const deleted = await db.delete(modules).where(eq(modules.id, moduleId)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Module not found' });
    }

    console.log(`[ADMIN API DELETE MODULE] Successfully cascade-deleted module ID: ${moduleId}`);
    res.json({ success: true, deletedModule: deleted[0] });
  } catch (error: any) {
    console.error(`[ADMIN API DELETE MODULE ERROR] Database failed to delete module ${moduleId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to delete module due to foreign key constraints' });
  }
});

// Subjects
adminRouter.post('/subjects', async (req, res) => {
  try {
    const result = await db.insert(subjects).values(req.body).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to add subject' });
  }
});
adminRouter.put('/subjects/:id', async (req, res) => {
  try {
    const result = await db.update(subjects).set(req.body).where(eq(subjects.id, parseInt(req.params.id))).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to edit subject' });
  }
});
adminRouter.delete('/subjects/:id', async (req: AuthRequest, res) => {
  const subjectId = parseInt(req.params.id, 10);
  console.log(`[ADMIN API DELETE SUBJECT] Request to delete subject ID: ${subjectId}`);
  if (isNaN(subjectId)) {
    return res.status(400).json({ error: 'Invalid subject ID' });
  }

  try {
    // 1. Find all chapters belonging to this subject
    const chapList = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.subjectId, subjectId));
    const chapIds = chapList.map(c => c.id);

    if (chapIds.length > 0) {
      // 2. Find all questions belonging to these chapters
      const qList = await db.select({ id: questions.id }).from(questions).where(inArray(questions.chapterId, chapIds));
      const qIds = qList.map(q => q.id);

      if (qIds.length > 0) {
        await db.delete(mistakes).where(inArray(mistakes.questionId, qIds));
        await db.delete(folderQuestions).where(inArray(folderQuestions.questionId, qIds));
        await db.delete(attemptAnswers).where(inArray(attemptAnswers.questionId, qIds));
        await db.delete(questions).where(inArray(questions.id, qIds));
      }

      // 3. Find all quizzes belonging to these chapters
      const quizList = await db.select({ id: quizzes.id }).from(quizzes).where(inArray(quizzes.chapterId, chapIds));
      const quizIds = quizList.map(qz => qz.id);

      if (quizIds.length > 0) {
        const attList = await db.select({ id: attempts.id }).from(attempts).where(inArray(attempts.quizId, quizIds));
        const attIds = attList.map(a => a.id);
        if (attIds.length > 0) {
          await db.delete(attemptAnswers).where(inArray(attemptAnswers.attemptId, attIds));
          await db.delete(attempts).where(inArray(attempts.id, attIds));
        }
        await db.delete(quizzes).where(inArray(quizzes.id, quizIds));
      }

      // Delete chapters
      await db.delete(chapters).where(inArray(chapters.id, chapIds));
    }

    // Delete subject
    const deleted = await db.delete(subjects).where(eq(subjects.id, subjectId)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    console.log(`[ADMIN API DELETE SUBJECT] Successfully cascade-deleted subject ID: ${subjectId}`);
    res.json({ success: true, deletedSubject: deleted[0] });
  } catch (error: any) {
    console.error(`[ADMIN API DELETE SUBJECT ERROR] Database failed to delete subject ${subjectId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to delete subject due to foreign key constraints' });
  }
});

// Chapters
adminRouter.post('/chapters', async (req, res) => {
  try {
    const result = await db.insert(chapters).values({ subjectId: req.body.subjectId, title: req.body.title }).returning();
    // Automatically create default Study and Mock quizzes for the new chapter
    await db.insert(quizzes).values([
      { chapterId: result[0].id, poolSize: 20, questionsPerAttempt: 10, mode: 'study' },
      { chapterId: result[0].id, poolSize: 50, questionsPerAttempt: 20, mode: 'mock', timeLimit: 30 }
    ]);
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to add chapter' });
  }
});
adminRouter.put('/chapters/:id', async (req, res) => {
  try {
    const result = await db.update(chapters).set(req.body).where(eq(chapters.id, parseInt(req.params.id))).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to edit chapter' });
  }
});
adminRouter.delete('/chapters/:id', async (req: AuthRequest, res) => {
  const chapterId = parseInt(req.params.id, 10);
  console.log(`[ADMIN API DELETE CHAPTER] Request to delete chapter ID: ${chapterId}`);
  if (isNaN(chapterId)) {
    return res.status(400).json({ error: 'Invalid chapter ID' });
  }

  try {
    // 1. Delete questions and their associations
    const qList = await db.select({ id: questions.id }).from(questions).where(eq(questions.chapterId, chapterId));
    const qIds = qList.map(q => q.id);

    if (qIds.length > 0) {
      await db.delete(mistakes).where(inArray(mistakes.questionId, qIds));
      await db.delete(folderQuestions).where(inArray(folderQuestions.questionId, qIds));
      await db.delete(attemptAnswers).where(inArray(attemptAnswers.questionId, qIds));
      await db.delete(questions).where(inArray(questions.id, qIds));
    }

    // 2. Delete quizzes and attempts
    const quizList = await db.select({ id: quizzes.id }).from(quizzes).where(inArray(quizzes.chapterId, [chapterId]));
    const quizIds = quizList.map(qz => qz.id);

    if (quizIds.length > 0) {
      const attList = await db.select({ id: attempts.id }).from(attempts).where(inArray(attempts.quizId, quizIds));
      const attIds = attList.map(a => a.id);
      if (attIds.length > 0) {
        await db.delete(attemptAnswers).where(inArray(attemptAnswers.attemptId, attIds));
        await db.delete(attempts).where(inArray(attempts.id, attIds));
      }
      await db.delete(quizzes).where(inArray(quizzes.id, quizIds));
    }

    // 3. Delete chapter
    const deleted = await db.delete(chapters).where(eq(chapters.id, chapterId)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Chapter not found' });
    }

    console.log(`[ADMIN API DELETE CHAPTER] Successfully cascade-deleted chapter ID: ${chapterId}`);
    res.json({ success: true, deletedChapter: deleted[0] });
  } catch (error: any) {
    console.error(`[ADMIN API DELETE CHAPTER ERROR] Database failed to delete chapter ${chapterId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to delete chapter due to foreign key constraints' });
  }
});

// Questions
adminRouter.get('/chapters/:id/questions', async (req, res) => {
  const qs = await db.select().from(questions).where(eq(questions.chapterId, parseInt(req.params.id)));
  res.json(qs);
});
adminRouter.post('/questions', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.imageUrl && data.imageUrl.startsWith('data:')) {
      data.imageUrl = saveBase64Image(data.imageUrl, 'question');
    }
    const result = await db.insert(questions).values(data).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to add question' });
  }
});
adminRouter.put('/questions/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.imageUrl && data.imageUrl.startsWith('data:')) {
      data.imageUrl = saveBase64Image(data.imageUrl, 'question');
    }
    const result = await db.update(questions).set(data).where(eq(questions.id, parseInt(req.params.id))).returning();
    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to edit question' });
  }
});
adminRouter.delete('/questions/:id', async (req: AuthRequest, res) => {
  const questionId = parseInt(req.params.id, 10);
  console.log(`[ADMIN API DELETE QUESTION] Request to delete question ID: ${questionId}`);
  if (isNaN(questionId)) {
    return res.status(400).json({ error: 'Invalid question ID' });
  }

  try {
    await db.delete(mistakes).where(eq(mistakes.questionId, questionId));
    await db.delete(folderQuestions).where(eq(folderQuestions.questionId, questionId));
    await db.delete(attemptAnswers).where(eq(attemptAnswers.questionId, questionId));
    const deleted = await db.delete(questions).where(eq(questions.id, questionId)).returning();
    if (deleted.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    console.log(`[ADMIN API DELETE QUESTION] Successfully deleted question ID: ${questionId}`);
    res.json({ success: true, deletedQuestion: deleted[0] });
  } catch (error: any) {
    console.error(`[ADMIN API DELETE QUESTION ERROR] Database failed to delete question ${questionId}:`, error);
    res.status(500).json({ error: error.message || 'Failed to delete question' });
  }
});

// Bulk Import Questions (JSON Array)
adminRouter.post('/chapters/:id/questions/bulk', async (req, res) => {
  const chapterId = parseInt(req.params.id);
  const questionsArray = req.body.questions;
  
  if (!Array.isArray(questionsArray)) return res.status(400).json({ error: 'Expected an array of questions' });
  
  const mapped = questionsArray.map(q => ({
    chapterId,
    type: q.type || 'mcq',
    content: q.content,
    choices: q.choices || [],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || ''
  }));
  
  const result = await db.insert(questions).values(mapped).returning();
  res.json({ success: true, count: result.length });
});

// ================= Payment Methods Management =================
adminRouter.get('/payment-methods', async (req, res) => {
  try {
    const list = await db.select().from(paymentMethods).orderBy(asc(paymentMethods.id));
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch payment methods' });
  }
});

adminRouter.post('/payment-methods', async (req, res) => {
  try {
    const { methodType, displayName, accountDetails, instructions, isActive } = req.body;
    if (!displayName || !displayName.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    if (!accountDetails || !accountDetails.trim()) {
      return res.status(400).json({ error: 'Account details are required' });
    }

    const result = await db.insert(paymentMethods).values({
      methodType: methodType || 'vodafone_cash',
      displayName: displayName.trim(),
      accountDetails: accountDetails.trim(),
      instructions: instructions ? instructions.trim() : null,
      isActive: isActive !== false
    }).returning();

    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to create payment method' });
  }
});

adminRouter.put('/payment-methods/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { methodType, displayName, accountDetails, instructions, isActive } = req.body;

    const updateData: any = {};
    if (methodType !== undefined) updateData.methodType = methodType;
    if (displayName !== undefined) updateData.displayName = displayName.trim();
    if (accountDetails !== undefined) updateData.accountDetails = accountDetails.trim();
    if (instructions !== undefined) updateData.instructions = instructions ? instructions.trim() : null;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const result = await db.update(paymentMethods)
      .set(updateData)
      .where(eq(paymentMethods.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    res.json(result[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to update payment method' });
  }
});

adminRouter.delete('/payment-methods/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    try {
      const deleted = await db.delete(paymentMethods).where(eq(paymentMethods.id, id)).returning();
      if (deleted.length === 0) {
        return res.status(404).json({ error: 'Payment method not found' });
      }
      res.json({ success: true });
    } catch (fkErr: any) {
      // If foreign key constraint triggers due to existing payment_requests, deactivate instead
      const updated = await db.update(paymentMethods)
        .set({ isActive: false })
        .where(eq(paymentMethods.id, id))
        .returning();
      res.json({ 
        success: true, 
        deactivated: true, 
        message: 'This payment method is referenced by existing payment requests and was set to inactive instead of deletion.',
        paymentMethod: updated[0] 
      });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to delete payment method' });
  }
});

adminRouter.get('/deletion-preview/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const itemId = parseInt(id, 10);
  if (isNaN(itemId)) return res.status(400).json({ error: 'Invalid ID' });

  try {
    if (type === 'modules') {
      const subList = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.moduleId, itemId));
      const subIds = subList.map(s => s.id);
      let chapIds: number[] = [];
      let qIds: number[] = [];
      if (subIds.length > 0) {
        const chapList = await db.select({ id: chapters.id }).from(chapters).where(inArray(chapters.subjectId, subIds));
        chapIds = chapList.map(c => c.id);
        if (chapIds.length > 0) {
          const qList = await db.select({ id: questions.id }).from(questions).where(inArray(questions.chapterId, chapIds));
          qIds = qList.map(q => q.id);
        }
      }
      const subsList = await db.select({ id: subscriptions.id }).from(subscriptions).where(eq(subscriptions.moduleId, itemId));
      const payList = await db.select({ id: paymentRequests.id }).from(paymentRequests).where(eq(paymentRequests.moduleId, itemId));

      res.json({
        subjects: subList.length,
        chapters: chapIds.length,
        questions: qIds.length,
        subscriptions: subsList.length,
        paymentRequests: payList.length
      });
    } else if (type === 'subjects') {
      const chapList = await db.select({ id: chapters.id }).from(chapters).where(eq(chapters.subjectId, itemId));
      const chapIds = chapList.map(c => c.id);
      let qIds: number[] = [];
      if (chapIds.length > 0) {
        const qList = await db.select({ id: questions.id }).from(questions).where(inArray(questions.chapterId, chapIds));
        qIds = qList.map(q => q.id);
      }
      res.json({
        chapters: chapIds.length,
        questions: qIds.length
      });
    } else if (type === 'chapters') {
      const qList = await db.select({ id: questions.id }).from(questions).where(eq(questions.chapterId, itemId));
      res.json({
        questions: qList.length
      });
    } else {
      res.json({});
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch deletion preview' });
  }
});

// Invite / Discount Codes Management
adminRouter.get('/invite-codes', async (req, res) => {
  try {
    const codes = await db.select().from(inviteCodes);
    res.json(codes);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch invite codes' });
  }
});

adminRouter.post('/invite-codes', async (req, res) => {
  try {
    const { code, discountType, discountValue, moduleId, usageLimit, isActive } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });
    const inserted = await db.insert(inviteCodes).values({
      code: code.toUpperCase().trim(),
      discountType: discountType || 'percentage',
      discountValue: discountValue || 0,
      moduleId: moduleId || null,
      usageLimit: usageLimit || null,
      isActive: isActive !== undefined ? isActive : true
    }).returning();
    res.json(inserted[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to create invite code' });
  }
});

adminRouter.put('/invite-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const updated = await db.update(inviteCodes).set(req.body).where(eq(inviteCodes.id, id)).returning();
    if (updated.length === 0) return res.status(404).json({ error: 'Code not found' });
    res.json(updated[0]);
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'Failed to update invite code' });
  }
});

adminRouter.delete('/invite-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await db.delete(inviteCodes).where(eq(inviteCodes.id, id)).returning();
    if (deleted.length === 0) return res.status(404).json({ error: 'Code not found' });
    res.json({ success: true, deleted: deleted[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to delete invite code' });
  }
});

