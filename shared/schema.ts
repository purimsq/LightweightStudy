import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  learningPace: integer("learning_pace").notNull().default(45),
  studyStreak: integer("study_streak").notNull().default(0),
  lastActiveDate: timestamp("last_active_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const units = pgTable("units", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("blue"),
  icon: text("icon").notNull().default("folder"),
  totalTopics: integer("total_topics").notNull().default(0),
  completedTopics: integer("completed_topics").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => units.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  extractedText: text("extracted_text"),
  summary: text("summary"),
  embeddings: json("embeddings"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id),
  title: text("title").notNull().default("Untitled Note"),
  content: text("content").notNull(),
  isMarkdown: boolean("is_markdown").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => units.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("assignment"), // assignment, cat, exam, quiz
  deadline: timestamp("deadline").notNull(),
  status: text("status").notNull().default("pending"), // pending, in_progress, completed
  questions: json("questions"),
  relatedDocuments: json("related_documents"),
  attachedFilePath: text("attached_file_path"), // PDF/DOCX file for the assignment
  attachedFileName: text("attached_file_name"),
  attachedFileType: text("attached_file_type"),
  extractedText: text("extracted_text"), // For editing assignment documents
  userGrade: integer("user_grade"), // Grade Mitchell achieved
  totalMarks: integer("total_marks"), // Total possible marks
  ollamaResult: json("ollama_result"), // Ollama's answer checking result
  progressContribution: integer("progress_contribution"), // Calculated progress points
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studyPlans = pgTable("study_plans", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  scheduledTopics: json("scheduled_topics"),
  completedTopics: json("completed_topics"),
  totalStudyTime: integer("total_study_time").notNull().default(0), // in minutes
  actualStudyTime: integer("actual_study_time").notNull().default(0),
  breaks: json("breaks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiChats = pgTable("ai_chats", {
  id: serial("id").primaryKey(),
  messages: json("messages").notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const unitProgress = pgTable("unit_progress", {
  id: serial("id").primaryKey(),
  unitId: integer("unit_id").references(() => units.id).notNull(),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  weeklyImprovement: integer("weekly_improvement").notNull().default(0),
  trend: text("trend").notNull().default("stable"), // up, down, stable
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUnitSchema = createInsertSchema(units).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
});

export const insertStudyPlanSchema = createInsertSchema(studyPlans).omit({
  id: true,
  createdAt: true,
});

export const insertAiChatSchema = createInsertSchema(aiChats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUnitProgressSchema = createInsertSchema(unitProgress).omit({
  id: true,
  createdAt: true,
  lastUpdated: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

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