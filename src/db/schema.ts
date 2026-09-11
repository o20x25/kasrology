import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, jsonb, uniqueIndex, index, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  academicYear: varchar('academic_year', { length: 50 }),
  phoneNumber: varchar('phone_number', { length: 50 }),
  profileCompleted: boolean('profile_completed').default(false),
  role: text('role').default('student'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  sessionToken: text('session_token').notNull().unique(),
  deviceInfo: text('device_info'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    studentIdIdx: index('sessions_student_id_idx').on(table.studentId),
  };
});

export const modules = pgTable('modules', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  price: integer('price').default(0), // Price in EGP
  durationType: varchar('duration_type', { length: 20 }).default('open_ended'), // 'fixed', 'open_ended'
  durationDays: integer('duration_days'), // null if open_ended
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  moduleId: integer('module_id').references(() => modules.id).notNull(),
  title: text('title').notNull(),
}, (table) => {
  return {
    moduleIdIdx: index('subjects_module_id_idx').on(table.moduleId),
  };
});

export const chapters = pgTable('chapters', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id).notNull(),
  title: text('title').notNull(),
}, (table) => {
  return {
    subjectIdIdx: index('chapters_subject_id_idx').on(table.subjectId),
  };
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id').references(() => chapters.id).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'mcq', 'true_false', 'essay'
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  choices: jsonb('choices'), // Array of strings for MCQ
  correctAnswer: text('correct_answer').notNull(),
  explanation: text('explanation'),
}, (table) => {
  return {
    chapterIdIdx: index('questions_chapter_id_idx').on(table.chapterId),
  };
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  moduleId: integer('module_id').references(() => modules.id).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  startDate: timestamp('start_date').defaultNow(),
  expiryDate: timestamp('expiry_date'), // null means lifetime
}, (table) => {
  return {
    studentIdIdx: index('subscriptions_student_id_idx').on(table.studentId),
    moduleIdIdx: index('subscriptions_module_id_idx').on(table.moduleId),
  };
});

export const paymentMethods = pgTable('payment_methods', {
  id: serial('id').primaryKey(),
  methodType: varchar('method_type', { length: 50 }).notNull(), // 'vodafone_cash', 'instapay', 'bank_transfer', 'other'
  displayName: text('display_name').notNull(),
  accountDetails: text('account_details').notNull(),
  instructions: text('instructions'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const paymentRequests = pgTable('payment_requests', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  moduleId: integer('module_id').references(() => modules.id).notNull(),
  paymentMethodId: integer('payment_method_id').references(() => paymentMethods.id),
  walletNumber: text('wallet_number').notNull(),
  screenshotUrl: text('screenshot_url'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected
  discountCode: text('discount_code'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const inviteCodes = pgTable('invite_codes', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // 'percentage', 'fixed'
  discountValue: integer('discount_value').notNull(),
  moduleId: integer('module_id').references(() => modules.id), // null if applies to any
  usageLimit: integer('usage_limit'),
  usedCount: integer('used_count').default(0),
  isActive: boolean('is_active').default(true),
});

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  chapterId: integer('chapter_id').references(() => chapters.id).notNull(),
  poolSize: integer('pool_size').notNull(),
  questionsPerAttempt: integer('questions_per_attempt').notNull(),
  mode: varchar('mode', { length: 20 }).notNull(), // 'study', 'mock'
  timeLimit: integer('time_limit'), // in minutes
}, (table) => {
  return {
    chapterIdIdx: index('quizzes_chapter_id_idx').on(table.chapterId),
  };
});

export const attempts = pgTable('attempts', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  quizId: integer('quiz_id').references(() => quizzes.id).notNull(),
  mode: varchar('mode', { length: 20 }).notNull(),
  questionIds: jsonb('question_ids').notNull(), // Array of IDs
  status: varchar('status', { length: 20 }).notNull().default('in_progress'), // 'in_progress', 'submitted'
  startedAt: timestamp('started_at').defaultNow(),
  submittedAt: timestamp('submitted_at'),
  score: integer('score'),
}, (table) => {
  return {
    studentIdIdx: index('attempts_student_id_idx').on(table.studentId),
    quizIdIdx: index('attempts_quiz_id_idx').on(table.quizId),
  };
});

export const attemptAnswers = pgTable('attempt_answers', {
  id: serial('id').primaryKey(),
  attemptId: integer('attempt_id').references(() => attempts.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  studentAnswer: text('student_answer'),
  isCorrect: boolean('is_correct'),
}, (table) => {
  return {
    attemptIdIdx: index('attempt_answers_attempt_id_idx').on(table.attemptId),
    questionIdIdx: index('attempt_answers_question_id_idx').on(table.questionId),
  };
});

export const mistakes = pgTable('mistakes', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
}, (table) => {
  return {
    studentQuestionIdx: uniqueIndex('student_question_idx').on(table.studentId, table.questionId)
  }
});

export const folders = pgTable('folders', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => {
  return {
    studentIdIdx: index('folders_student_id_idx').on(table.studentId),
  };
});

export const folderQuestions = pgTable('folder_questions', {
  id: serial('id').primaryKey(),
  folderId: integer('folder_id').references(() => folders.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
}, (table) => {
  return {
    folderQuestionIdx: uniqueIndex('folder_question_idx').on(table.folderId, table.questionId)
  }
});

export const flags = pgTable('flags', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  attemptId: integer('attempt_id').references(() => attempts.id),
});

export const progress = pgTable('progress', {
  id: serial('id').primaryKey(),
  studentId: integer('student_id').references(() => users.id).notNull(),
  questionId: integer('question_id').references(() => questions.id).notNull(),
  correctCount: integer('correct_count').default(0),
  incorrectCount: integer('incorrect_count').default(0),
});
