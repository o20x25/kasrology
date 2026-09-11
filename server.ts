import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { requireAuth, optionalAuth, requireAdmin, AuthRequest, invalidateAuthCache } from './src/middleware/auth.ts';
import { db } from './src/db/index.ts';
import { users, sessions, modules, subjects, chapters, questions, subscriptions, paymentRequests, paymentMethods, quizzes, attempts, attemptAnswers, mistakes, folders, folderQuestions, inviteCodes } from './src/db/schema.ts';
import { adminRouter } from './src/routes/admin.ts';
import { eq, and, inArray, desc, asc } from 'drizzle-orm';
import { saveBase64Image } from './src/lib/image-storage.ts';
import crypto from 'crypto';

const ADMIN_EMAILS = ['o.20x25@gmail.com']; // Auto-grant admin to this email

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Debug request logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      console.log(`[HTTP ${req.method}] ${req.path}`);
    }
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/admin', adminRouter);

  // Sync user & create session
  app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email!;
      const name = req.user!.name || req.body.name || 'Student';
      const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
      
      const isConfiguredAdmin = ADMIN_EMAILS.includes(email);

      // Upsert user
      let dbUser = req.dbUser;
      if (!dbUser) {
        const initialRole = isConfiguredAdmin ? 'admin' : 'student';
        const result = await db.insert(users)
          .values({ uid, email, name, role: initialRole })
          .onConflictDoUpdate({
            target: users.uid,
            set: { email, name },
          })
          .returning();
        dbUser = result[0];
      } else if (isConfiguredAdmin && dbUser.role !== 'admin') {
        // Ensure primary configured admin emails are always admin
        const result = await db.update(users).set({ role: 'admin' }).where(eq(users.id, dbUser.id)).returning();
        dbUser = result[0];
      } else if (name && dbUser.name !== name) {
        const result = await db.update(users).set({ name }).where(eq(users.id, dbUser.id)).returning();
        dbUser = result[0];
      }

      // Single active session logic
      // 1. Invalidate all existing sessions
      await db.update(sessions)
        .set({ isActive: false })
        .where(eq(sessions.studentId, dbUser.id));

      // 2. Create new session
      const sessionToken = crypto.randomUUID();
      await db.insert(sessions).values({
        studentId: dbUser.id,
        sessionToken,
        deviceInfo,
        isActive: true
      });

      invalidateAuthCache(uid);

      res.json({ user: dbUser, sessionToken });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update User Profile (Complete Profile or Edit Profile)
  app.post('/api/user/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { firstName, lastName, academicYear, phoneNumber } = req.body;
      if (!firstName || !lastName || !academicYear || !phoneNumber) {
        return res.status(400).json({ error: 'All profile fields are required' });
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      const updated = await db.update(users)
        .set({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          name: fullName,
          academicYear: academicYear.trim(),
          phoneNumber: phoneNumber.trim(),
          profileCompleted: true
        })
        .where(eq(users.id, req.dbUser.id))
        .returning();

      invalidateAuthCache(req.user!.uid);

      res.json({ success: true, user: updated[0] });
    } catch (error: any) {
      console.error('[UPDATE PROFILE ERROR]', error);
      res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  });

  // Get student's profile details, subscriptions and payment requests
  app.get('/api/user/profile-details', requireAuth, async (req: AuthRequest, res) => {
    try {
      const studentSubs = await db.select().from(subscriptions)
        .where(eq(subscriptions.studentId, req.dbUser.id));
      const mods = await db.select().from(modules);

      const enrichedSubs = studentSubs.map(s => ({
        ...s,
        module: mods.find(m => m.id === s.moduleId)
      }));

      const paymentReqs = await db.select().from(paymentRequests)
        .where(eq(paymentRequests.studentId, req.dbUser.id))
        .orderBy(desc(paymentRequests.id));
      const methods = await db.select().from(paymentMethods);

      const enrichedPayments = paymentReqs.map(p => ({
        ...p,
        module: mods.find(m => m.id === p.moduleId),
        paymentMethod: methods.find(m => m.id === p.paymentMethodId)
      }));

      res.json({
        user: req.dbUser,
        subscriptions: enrichedSubs,
        paymentRequests: enrichedPayments
      });
    } catch (error: any) {
      console.error('[PROFILE DETAILS ERROR]', error);
      res.status(500).json({ error: 'Failed to fetch profile details' });
    }
  });

  // Get active payment methods for student subscription
  app.get('/api/payment-methods', async (req, res) => {
    try {
      const activeMethods = await db.select().from(paymentMethods)
        .where(eq(paymentMethods.isActive, true))
        .orderBy(asc(paymentMethods.id));
      res.json(activeMethods);
    } catch (error: any) {
      console.error('[PAYMENT METHODS FETCH ERROR]', error);
      res.status(500).json({ error: 'Failed to fetch payment methods' });
    }
  });

  // Get student's personal payment requests
  app.get('/api/student/payment-requests', requireAuth, async (req: AuthRequest, res) => {
    try {
      const requests = await db.select().from(paymentRequests)
        .where(eq(paymentRequests.studentId, req.dbUser.id))
        .orderBy(desc(paymentRequests.id));
      const mods = await db.select().from(modules);
      const methods = await db.select().from(paymentMethods);

      res.json(requests.map(r => ({
        ...r,
        module: mods.find(m => m.id === r.moduleId),
        paymentMethod: methods.find(m => m.id === r.paymentMethodId)
      })));
    } catch (error: any) {
      console.error('[STUDENT PAYMENTS ERROR]', error);
      res.status(500).json({ error: 'Failed to fetch payment history' });
    }
  });

  // Get modules (Accessible to guests and logged-in users, enriched with payment and subscription status)
  app.get('/api/modules', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const allModules = await db.select().from(modules).where(eq(modules.isActive, true));
      
      let subbedModuleIds = new Set<number>();
      let pendingModuleIds = new Set<number>();
      let latestPaymentByModule = new Map<number, any>();
      let isAdmin = false;

      if (req.dbUser) {
        const userSubs = await db.select().from(subscriptions).where(
          and(eq(subscriptions.studentId, req.dbUser.id), eq(subscriptions.status, 'active'))
        );
        subbedModuleIds = new Set(userSubs.map(s => s.moduleId));
        isAdmin = req.dbUser.role === 'admin';

        const userPayments = await db.select().from(paymentRequests)
          .where(eq(paymentRequests.studentId, req.dbUser.id))
          .orderBy(desc(paymentRequests.id));

        for (const p of userPayments) {
          if (!latestPaymentByModule.has(p.moduleId)) {
            latestPaymentByModule.set(p.moduleId, p);
            if (p.status === 'pending') pendingModuleIds.add(p.moduleId);
          }
        }
      }

      res.json(allModules.map(m => {
        const isSub = isAdmin || subbedModuleIds.has(m.id);
        const latestPay = latestPaymentByModule.get(m.id);
        return {
          ...m,
          isSubscribed: isSub,
          paymentStatus: isSub ? 'approved' : (latestPay ? latestPay.status : null),
          pendingPayment: !isSub && pendingModuleIds.has(m.id),
        };
      }));
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch modules' });
    }
  });

  // Get module details
  app.get('/api/modules/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const moduleId = parseInt(req.params.id);
      
      const moduleInfo = await db.select().from(modules).where(eq(modules.id, moduleId));
      if (moduleInfo.length === 0) return res.status(404).json({ error: 'Module not found' });

      // Fetch subjects
      const modSubjects = await db.select().from(subjects).where(eq(subjects.moduleId, moduleId));
      
      // Fetch chapters for these subjects
      const subjectIds = modSubjects.map(s => s.id);
      let modChapters: any[] = [];
      let modQuizzes: any[] = [];
      
      if (subjectIds.length > 0) {
        modChapters = await db.select().from(chapters).where(inArray(chapters.subjectId, subjectIds));
        const chapterIds = modChapters.map(c => c.id);
        if (chapterIds.length > 0) {
          modQuizzes = await db.select().from(quizzes).where(inArray(quizzes.chapterId, chapterIds));
        }
      }

      res.json({
        module: moduleInfo[0],
        subjects: modSubjects,
        chapters: modChapters,
        quizzes: modQuizzes
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch module details' });
    }
  });

  // Validate discount code
  app.post('/api/discount/validate', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { code, moduleId } = req.body;
      if (!code) return res.status(400).json({ error: 'Code is required' });
      const found = await db.select().from(inviteCodes).where(and(eq(inviteCodes.code, code.toUpperCase().trim()), eq(inviteCodes.isActive, true)));
      if (found.length === 0) {
        return res.status(400).json({ error: 'Invalid or inactive discount code' });
      }
      const invite = found[0];
      if (invite.moduleId && invite.moduleId !== parseInt(moduleId)) {
        return res.status(400).json({ error: 'This coupon code is not valid for this module' });
      }
      if (invite.usageLimit && invite.usedCount >= invite.usageLimit) {
        return res.status(400).json({ error: 'This coupon code has reached its usage limit' });
      }
      res.json({ success: true, code: invite.code, discountType: invite.discountType, discountValue: invite.discountValue });
    } catch (e: any) {
      res.status(500).json({ error: e.message || 'Failed to validate discount code' });
    }
  });

  // Subscribe / Payment Request (with physical file storage & WhatsApp/Webhook notification)
  app.post('/api/modules/:id/subscribe', requireAuth, async (req: AuthRequest, res) => {
    try {
      const moduleId = parseInt(req.params.id, 10);
      const { walletNumber, screenshotUrl, paymentMethodId, discountCode } = req.body;
      
      if (!walletNumber || !String(walletNumber).trim()) {
        return res.status(400).json({ error: 'Wallet or account number is required' });
      }
      if (!screenshotUrl) {
        return res.status(400).json({ error: 'Payment receipt screenshot is required' });
      }

      // Save screenshot to static storage (public/uploads) as a real file instead of storing base64
      let savedScreenshotUrl = screenshotUrl;
      if (typeof screenshotUrl === 'string' && screenshotUrl.startsWith('data:')) {
        savedScreenshotUrl = saveBase64Image(screenshotUrl, 'payment');
      }

      const parsedMethodId = paymentMethodId ? parseInt(String(paymentMethodId), 10) : null;

      const inserted = await db.insert(paymentRequests).values({
        studentId: req.dbUser.id,
        moduleId,
        paymentMethodId: parsedMethodId,
        walletNumber: String(walletNumber).trim(),
        screenshotUrl: savedScreenshotUrl,
        discountCode: discountCode ? String(discountCode).toUpperCase().trim() : null,
        status: 'pending'
      }).returning();

      // Retrieve module info
      const modRes = await db.select().from(modules).where(eq(modules.id, moduleId));
      const modTitle = modRes[0]?.title || `Module #${moduleId}`;
      const modPrice = modRes[0]?.price ?? 0;

      // Retrieve payment method info
      let methodDisplayName = 'فودافون كاش (Vodafone Cash)';
      if (parsedMethodId) {
        const pmRes = await db.select().from(paymentMethods).where(eq(paymentMethods.id, parsedMethodId));
        if (pmRes.length > 0) {
          methodDisplayName = pmRes[0].displayName;
        }
      }

      const studentName = req.dbUser.name || 'طالب جديد';
      const studentEmail = req.dbUser.email || '';
      const nowFormatted = new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' });

      // Generate prefilled WhatsApp message
      const waMessage = 
`يرجى تأكيد شراء كورس ${modTitle} بـ${modPrice} EGP
وسيلة التحويل : ${methodDisplayName}
الرقم المحول منه : ${String(walletNumber).trim()}
ارسل صورة لايصال التحويل للتأكيد و سيتم المراجعه ف اسرع وقت`;

      const adminPhone = process.env.ADMIN_WHATSAPP_NUMBER 
        ? process.env.ADMIN_WHATSAPP_NUMBER.replace(/[^0-9]/g, '') 
        : '';

      const whatsappUrl = adminPhone
        ? `https://wa.me/${adminPhone}?text=${encodeURIComponent(waMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(waMessage)}`;

      // Trigger Webhook if configured in environment
      if (process.env.ADMIN_NOTIFICATION_WEBHOOK) {
        fetch(process.env.ADMIN_NOTIFICATION_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'new_payment_request',
            requestId: inserted[0].id,
            studentName,
            studentEmail,
            moduleId,
            moduleTitle: modTitle,
            price: modPrice,
            paymentMethod: methodDisplayName,
            walletNumber: String(walletNumber).trim(),
            screenshotUrl: savedScreenshotUrl,
            whatsappUrl,
            createdAt: new Date().toISOString()
          })
        }).catch(err => console.warn('[PAYMENT WEBHOOK ERROR]', err));
      }

      console.log(`[PAYMENT SUBMITTED] Request #${inserted[0].id} for ${studentName} (${modTitle}) via ${methodDisplayName}`);

      res.json({ 
        success: true, 
        message: 'Payment request submitted successfully',
        requestId: inserted[0].id,
        whatsappUrl,
        savedScreenshotUrl
      });
    } catch (error: any) {
      console.error('[SUBSCRIBE ERROR]', error);
      res.status(500).json({ error: error.message || 'Failed to submit payment request' });
    }
  });

  // Admin Routes: Payments
  app.get('/api/admin/payments', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      let query = db.select().from(paymentRequests);
      
      if (statusFilter && statusFilter !== 'all') {
        query = query.where(eq(paymentRequests.status, statusFilter)) as any;
      }
      
      const requests = await query.orderBy(desc(paymentRequests.id));
      const students = await db.select().from(users);
      const mods = await db.select().from(modules);
      const methods = await db.select().from(paymentMethods);

      const enriched = requests.map(r => ({
        ...r,
        student: students.find(s => s.id === r.studentId),
        module: mods.find(m => m.id === r.moduleId),
        paymentMethod: methods.find(m => m.id === r.paymentMethodId)
      }));

      res.json(enriched);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch payment requests' });
    }
  });

  app.post('/api/admin/payments/:id/approve', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      
      const reqs = await db.select().from(paymentRequests).where(eq(paymentRequests.id, requestId));
      if (reqs.length === 0) return res.status(404).json({ error: 'Payment request not found' });
      
      const pr = reqs[0];

      // Get module to check duration
      const mods = await db.select().from(modules).where(eq(modules.id, pr.moduleId));
      if (mods.length === 0) return res.status(404).json({ error: 'Module not found' });
      const mod = mods[0];

      // Calculate expiry date if fixed duration
      let expiryDate: Date | null = null;
      if (mod.durationType === 'fixed' && mod.durationDays) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + mod.durationDays);
      }

      // Update PR status
      await db.update(paymentRequests).set({ status: 'approved' }).where(eq(paymentRequests.id, requestId));

      // Upsert subscription
      const existingSub = await db.select().from(subscriptions).where(
        and(eq(subscriptions.studentId, pr.studentId), eq(subscriptions.moduleId, pr.moduleId))
      );

      if (existingSub.length > 0) {
        await db.update(subscriptions).set({
          status: 'active',
          startDate: new Date(),
          expiryDate: expiryDate
        }).where(eq(subscriptions.id, existingSub[0].id));
      } else {
        await db.insert(subscriptions).values({
          studentId: pr.studentId,
          moduleId: pr.moduleId,
          status: 'active',
          startDate: new Date(),
          expiryDate: expiryDate
        });
      }

      if (pr.discountCode) {
        const invite = await db.select().from(inviteCodes).where(eq(inviteCodes.code, pr.discountCode));
        if (invite.length > 0) {
          await db.update(inviteCodes)
            .set({ usedCount: (invite[0].usedCount || 0) + 1 })
            .where(eq(inviteCodes.code, pr.discountCode));
        }
      }

      res.json({ success: true, message: 'Payment approved and module subscription activated' });
    } catch (error: any) {
      console.error('[APPROVE PAYMENT ERROR]', error);
      res.status(500).json({ error: 'Failed to approve payment' });
    }
  });

  app.post('/api/admin/payments/:id/reject', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const requestId = parseInt(req.params.id, 10);
      const updated = await db.update(paymentRequests)
        .set({ status: 'rejected' })
        .where(eq(paymentRequests.id, requestId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: 'Payment request not found' });
      }

      res.json({ success: true, message: 'Payment request rejected' });
    } catch (error: any) {
      console.error('[REJECT PAYMENT ERROR]', error);
      res.status(500).json({ error: 'Failed to reject payment' });
    }
  });

  // Start Quiz Attempt
  app.post('/api/quizzes/:id/start', requireAuth, async (req: AuthRequest, res) => {
    try {
      const quizId = parseInt(req.params.id);
      
      // Get quiz
      const quiz = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
      if (quiz.length === 0) return res.status(404).json({ error: 'Quiz not found' });
      
      // Select random questions
      const allQuestions = await db.select().from(questions).where(eq(questions.chapterId, quiz[0].chapterId));
      
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, quiz[0].questionsPerAttempt);
      const selectedIds = selected.map(q => q.id);
      
      // Create attempt
      const attempt = await db.insert(attempts).values({
        studentId: req.dbUser.id,
        quizId,
        mode: quiz[0].mode,
        questionIds: selectedIds,
        status: 'in_progress',
      }).returning();
      
      // Create attempt answers shells in a single bulk insert
      if (selected.length > 0) {
        await db.insert(attemptAnswers).values(
          selected.map(q => ({
            attemptId: attempt[0].id,
            questionId: q.id,
          }))
        );
      }
      
      // Remove correct answer from payload
      const safeQuestions = selected.map(q => {
        const { correctAnswer, explanation, ...safeQ } = q;
        return safeQ;
      });
      
      res.json({ attempt: attempt[0], questions: safeQuestions });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: 'Failed to start quiz' });
    }
  });

  // Submit Quiz Attempt
  app.post('/api/attempts/:id/submit', requireAuth, async (req: AuthRequest, res) => {
    try {
      const attemptId = parseInt(req.params.id);
      const answers: Record<number, string> = req.body.answers || {}; // { questionId: "answer" }
      
      const attempt = await db.select().from(attempts).where(eq(attempts.id, attemptId));
      if (attempt.length === 0 || attempt[0].studentId !== req.dbUser.id) {
        return res.status(404).json({ error: 'Attempt not found' });
      }
      
      if (attempt[0].status === 'submitted') {
        return res.json({ success: true, score: attempt[0].score, attempt: attempt[0], message: 'Already submitted' });
      }
      
      const questionIds = (attempt[0].questionIds as number[]) || [];
      if (questionIds.length === 0) {
        return res.status(400).json({ error: 'No questions found in this attempt' });
      }

      // Fetch only the specific questions for this attempt using inArray
      const questionsData = await db.select().from(questions).where(inArray(questions.id, questionIds));
      const questionMap = new Map(questionsData.map(x => [x.id, x]));
      
      let correctCount = 0;
      const correctQuestionIds: number[] = [];
      const incorrectQuestionIds: number[] = [];

      for (const qId of questionIds) {
        const studentAns = answers[qId];
        const q = questionMap.get(qId);
        if (!q) continue;

        const isCorrect = studentAns === q.correctAnswer;
        if (isCorrect) {
          correctCount++;
          correctQuestionIds.push(qId);
        } else {
          incorrectQuestionIds.push(qId);
        }
      }

      // Batch update attempt answers concurrently
      await Promise.all(
        questionIds.map(qId => {
          const studentAns = answers[qId];
          const q = questionMap.get(qId);
          const isCorrect = q ? studentAns === q.correctAnswer : false;
          return db.update(attemptAnswers)
            .set({ studentAnswer: studentAns || null, isCorrect })
            .where(and(eq(attemptAnswers.attemptId, attemptId), eq(attemptAnswers.questionId, qId)));
        })
      );

      // Batch update mistakes: remove resolved mistakes in a single query
      if (correctQuestionIds.length > 0) {
        try {
          await db.delete(mistakes).where(
            and(
              eq(mistakes.studentId, req.dbUser.id),
              inArray(mistakes.questionId, correctQuestionIds)
            )
          );
        } catch (mistakeErr) {
          console.error('Failed to cleanup corrected mistakes:', mistakeErr);
        }
      }

      // Batch update mistakes: insert new incorrect questions with onConflictDoNothing
      if (incorrectQuestionIds.length > 0) {
        try {
          await db.insert(mistakes).values(
            incorrectQuestionIds.map(qId => ({
              studentId: req.dbUser.id,
              questionId: qId,
            }))
          ).onConflictDoNothing();
        } catch (mistakeErr) {
          console.error('Failed to batch insert mistakes:', mistakeErr);
        }
      }
      
      const score = Math.round((correctCount / questionIds.length) * 100);
      
      const finalAttempt = await db.update(attempts)
        .set({ status: 'submitted', submittedAt: new Date(), score })
        .where(eq(attempts.id, attemptId))
        .returning();
        
      res.json({ success: true, score, attempt: finalAttempt[0] });
    } catch (error: any) {
      console.error('SUBMIT QUIZ ERROR:', error);
      res.status(500).json({ error: 'Failed to submit quiz' });
    }
  });

  // Progress Stats API
  app.get('/api/progress/stats', requireAuth, async (req: AuthRequest, res) => {
    try {
      // Get all submitted attempts for the user, joined with modules
      const userAttempts = await db.select({
        id: attempts.id,
        score: attempts.score,
        submittedAt: attempts.submittedAt,
        moduleTitle: modules.title,
        mode: attempts.mode
      })
      .from(attempts)
      .innerJoin(quizzes, eq(attempts.quizId, quizzes.id))
      .innerJoin(chapters, eq(quizzes.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .innerJoin(modules, eq(subjects.moduleId, modules.id))
      .where(and(eq(attempts.studentId, req.dbUser.id), eq(attempts.status, 'submitted')));

      res.json(userAttempts);
    } catch (error) {
      console.error('Stats Error:', error);
      res.status(500).json({ error: 'Failed to load stats' });
    }
  });

  // Mistakes & Folders routes
  app.get('/api/mistakes', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userMistakes = await db.select({ 
        mistakeId: mistakes.id, 
        question: questions,
        chapterTitle: chapters.title,
        subjectTitle: subjects.title,
        moduleTitle: modules.title
      })
        .from(mistakes)
        .innerJoin(questions, eq(mistakes.questionId, questions.id))
        .innerJoin(chapters, eq(questions.chapterId, chapters.id))
        .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
        .innerJoin(modules, eq(subjects.moduleId, modules.id))
        .where(eq(mistakes.studentId, req.dbUser.id));
      res.json(userMistakes);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
  });

  app.post('/api/mistakes/retake', requireAuth, async (req: AuthRequest, res) => {
    try {
      let qIds = req.body?.questionIds;
      
      if (!qIds || !Array.isArray(qIds) || qIds.length === 0) {
        const userMistakes = await db.select({ questionId: mistakes.questionId })
          .from(mistakes)
          .where(eq(mistakes.studentId, req.dbUser.id));
          
        if (userMistakes.length === 0) {
          return res.status(400).json({ error: 'No mistakes to retake' });
        }
        
        qIds = userMistakes.map(m => m.questionId);
      }
      
      // Get any valid chapter to attach the dummy quiz to
      const firstQ = await db.select({ chapterId: questions.chapterId }).from(questions).where(eq(questions.id, qIds[0]));
      
      // Create a transient quiz for these mistakes
      const customQuiz = await db.insert(quizzes).values({
        chapterId: firstQ[0].chapterId,
        poolSize: qIds.length,
        questionsPerAttempt: qIds.length,
        mode: 'study'
      }).returning();
      
      // Create attempt with the exact mistake question IDs
      const newAttempt = await db.insert(attempts).values({
        studentId: req.dbUser.id,
        quizId: customQuiz[0].id,
        mode: 'study',
        questionIds: qIds,
      }).returning();
      
      res.json({ attemptId: newAttempt[0].id, quizId: customQuiz[0].id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate quiz' });
    }
  });

  app.get('/api/folders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const userFolders = await db.select().from(folders).where(eq(folders.studentId, req.dbUser.id));
      res.json(userFolders);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
  });

  app.post('/api/folders', requireAuth, async (req: AuthRequest, res) => {
    try {
      const name = req.body.name.trim();
      
      // Check if folder with same name already exists for this user
      const existing = await db.select().from(folders).where(
        and(eq(folders.studentId, req.dbUser.id), eq(folders.name, name))
      );
      
      if (existing.length > 0) {
        return res.json(existing[0]);
      }
      
      const result = await db.insert(folders).values({ studentId: req.dbUser.id, name }).returning();
      res.json(result[0]);
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
  });
  
  app.post('/api/folders/:id/questions', requireAuth, async (req: AuthRequest, res) => {
    try {
      await db.insert(folderQuestions).values({
        folderId: parseInt(req.params.id),
        questionId: req.body.questionId
      }).onConflictDoNothing();
      res.json({ success: true });
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
  });

  app.get('/api/folders/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const folderId = parseInt(req.params.id);
      
      const folderInfo = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.studentId, req.dbUser.id)));
        
      if (folderInfo.length === 0) return res.status(404).json({ error: 'Folder not found' });
      
      const fQuestions = await db.select({
        questionId: questions.id,
        content: questions.content,
        chapterTitle: chapters.title,
        subjectTitle: subjects.title,
        moduleTitle: modules.title
      })
      .from(folderQuestions)
      .innerJoin(questions, eq(folderQuestions.questionId, questions.id))
      .innerJoin(chapters, eq(questions.chapterId, chapters.id))
      .innerJoin(subjects, eq(chapters.subjectId, subjects.id))
      .innerJoin(modules, eq(subjects.moduleId, modules.id))
      .where(eq(folderQuestions.folderId, folderId));

      res.json({ ...folderInfo[0], questions: fQuestions });
    } catch (error) { res.status(500).json({ error: 'Failed' }); }
  });

  app.post('/api/folders/:id/retake', requireAuth, async (req: AuthRequest, res) => {
    try {
      const folderId = parseInt(req.params.id);
      
      // Verify folder ownership
      const folderInfo = await db.select().from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.studentId, req.dbUser.id)));
      if (folderInfo.length === 0) return res.status(404).json({ error: 'Folder not found' });
      
      const fQuestions = await db.select({ questionId: folderQuestions.questionId })
        .from(folderQuestions)
        .where(eq(folderQuestions.folderId, folderId));
        
      if (fQuestions.length === 0) {
        return res.status(400).json({ error: 'No questions in this folder' });
      }
      
      const qIds = fQuestions.map(q => q.questionId);
      
      // Get any valid chapter to attach the dummy quiz to
      const firstQ = await db.select({ chapterId: questions.chapterId }).from(questions).where(eq(questions.id, qIds[0]));
      
      // Create a transient quiz for these folder questions
      const customQuiz = await db.insert(quizzes).values({
        chapterId: firstQ[0].chapterId,
        poolSize: qIds.length,
        questionsPerAttempt: qIds.length,
        mode: 'study'
      }).returning();
      
      // Create attempt
      const newAttempt = await db.insert(attempts).values({
        studentId: req.dbUser.id,
        quizId: customQuiz[0].id,
        mode: 'study',
        questionIds: qIds,
      }).returning();
      
      res.json({ attemptId: newAttempt[0].id, quizId: customQuiz[0].id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to generate quiz' });
    }
  });

  // Serve static assets from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Setup Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
