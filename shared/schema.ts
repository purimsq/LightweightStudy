import { sqliteTable, integer, text, real, blob } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table - Core user information
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  avatar: text('avatar').notNull().default('U'),
  learningPace: integer('learning_pace').notNull().default(45),
  studyStreak: integer('study_streak').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  phone: text('phone'),
  bio: text('bio'),
  location: text('location'),
  lastLoginDate: integer('last_login_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Sessions table for JWT token management
export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Units table - Study subjects/courses (user-specific)
export const units = sqliteTable('units', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color').notNull().default('blue'),
  icon: text('icon').notNull().default('folder'),
  totalTopics: integer('total_topics').notNull().default(0),
  completedTopics: integer('completed_topics').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Documents table - Study materials (user-specific)
export const documents = sqliteTable('documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unitId: integer('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  fileType: text('file_type').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  extractedText: text('extracted_text'),
  summary: text('summary'),
  embeddings: text('embeddings'), // JSON string for SQLite
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Notes table - User notes (user-specific)
export const notes = sqliteTable('notes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentId: integer('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('Untitled Note'),
  content: text('content').notNull(),
  isMarkdown: integer('is_markdown', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Assignments table - Tasks and assessments (user-specific)
export const assignments = sqliteTable('assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unitId: integer('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  type: text('type').notNull().default('assignment'), // assignment, cat, exam, quiz
  deadline: integer('deadline', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull().default('pending'), // pending, in_progress, completed
  questions: text('questions'), // JSON string
  relatedDocuments: text('related_documents'), // JSON string
  attachedFilePath: text('attached_file_path'),
  attachedFileName: text('attached_file_name'),
  attachedFileType: text('attached_file_type'),
  extractedText: text('extracted_text'),
  userGrade: integer('user_grade'),
  totalMarks: integer('total_marks'),
  ollamaResult: text('ollama_result'), // JSON string
  progressContribution: integer('progress_contribution'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Study Plans table - Daily study schedules (user-specific)
export const studyPlans = sqliteTable('study_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  scheduledTopics: text('scheduled_topics'), // JSON string
  completedTopics: text('completed_topics'), // JSON string
  totalStudyTime: integer('total_study_time').notNull().default(0), // in minutes
  actualStudyTime: integer('actual_study_time').notNull().default(0),
  breaks: text('breaks'), // JSON string
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// AI Chats table - Conversation history (user-specific)
export const aiChats = sqliteTable('ai_chats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  messages: text('messages').notNull(), // JSON string
  sessionId: text('session_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Unit Progress table - Progress tracking (user-specific)
export const unitProgress = sqliteTable('unit_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unitId: integer('unit_id').notNull().references(() => units.id, { onDelete: 'cascade' }),
  progressPercentage: integer('progress_percentage').notNull().default(0),
  weeklyImprovement: integer('weekly_improvement').notNull().default(0),
  trend: text('trend').notNull().default('stable'), // up, down, stable
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Music table - Background music (user-specific)
export const music = sqliteTable('music', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  fileType: text('file_type').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull().default(0),
  artist: text('artist').notNull().default('Unknown Artist'),
  duration: text('duration').notNull().default('0:00'),
  uploadedAt: integer('uploaded_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Quizzes table - Interactive quizzes (user-specific)
export const quizzes = sqliteTable('quizzes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  unitId: integer('unit_id').references(() => units.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  questions: text('questions').notNull(), // JSON string
  timeLimit: integer('time_limit'), // in minutes
  totalMarks: integer('total_marks').notNull().default(0),
  passingScore: integer('passing_score').notNull().default(70),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Quiz Attempts table - User quiz attempts
export const quizAttempts = sqliteTable('quiz_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  quizId: integer('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  answers: text('answers').notNull(), // JSON string
  score: integer('score').notNull().default(0),
  timeSpent: integer('time_spent').notNull().default(0), // in seconds
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  userId: true,
  uploadedAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertAiChatSchema = createInsertSchema(aiChats).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUnitProgressSchema = createInsertSchema(unitProgress).omit({
  id: true,
  userId: true,
  createdAt: true,
  lastUpdated: true,
});

export const insertMusicSchema = createInsertSchema(music).omit({
  id: true,
  userId: true,
  uploadedAt: true,
});

export const insertQuizSchema = createInsertSchema(quizzes).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertQuizAttemptSchema = createInsertSchema(quizAttempts).omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Unit = typeof units.$inferSelect;
export type InsertUnit = z.infer<typeof insertUnitSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Note = typeof notes.$inferSelect;
export type InsertNote = z.infer<typeof insertNoteSchema>;

export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;

export type StudyPlan = typeof studyPlans.$inferSelect;
export type InsertStudyPlan = z.infer<typeof insertStudyPlanSchema>;

export type AiChat = typeof aiChats.$inferSelect;
export type InsertAiChat = z.infer<typeof insertAiChatSchema>;

export type UnitProgress = typeof unitProgress.$inferSelect;
export type InsertUnitProgress = z.infer<typeof insertUnitProgressSchema>;

export type Music = typeof music.$inferSelect;
export type InsertMusic = z.infer<typeof insertMusicSchema>;

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = z.infer<typeof insertQuizSchema>;

export type QuizAttempt = typeof quizAttempts.$inferSelect;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;