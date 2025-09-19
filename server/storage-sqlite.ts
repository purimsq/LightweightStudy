import { db } from './database';
import * as schema from '../shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class SQLiteStorage {
  // Users
  async getUser(id: number): Promise<schema.User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<schema.User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0];
  }

  async createUser(userData: schema.InsertUser): Promise<schema.User> {
    // Password is already hashed in auth service, so use it directly
    const result = await db.insert(schema.users).values(userData).returning();
    return result[0];
  }

  async updateUser(id: number, userData: Partial<schema.InsertUser>): Promise<schema.User> {
    const result = await db
      .update(schema.users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return result[0];
  }

  // Sessions
  async createSession(sessionData: schema.InsertSession): Promise<schema.Session> {
    const result = await db.insert(schema.sessions).values(sessionData).returning();
    return result[0];
  }

  async getSessionByToken(token: string): Promise<schema.Session | undefined> {
    const result = await db.select().from(schema.sessions).where(eq(schema.sessions.token, token)).limit(1);
    return result[0];
  }

  async updateSession(id: number, sessionData: Partial<schema.InsertSession>): Promise<schema.Session> {
    const result = await db
      .update(schema.sessions)
      .set(sessionData)
      .where(eq(schema.sessions.id, id))
      .returning();
    return result[0];
  }

  async deleteSessionByToken(token: string): Promise<boolean> {
    const result = await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
    return result.changes > 0;
  }

  async deleteExpiredSessions(now: Date): Promise<number> {
    const result = await db
      .delete(schema.sessions)
      .where(eq(schema.sessions.expiresAt, now));
    return result.changes;
  }

  // Units (user-specific)
  async getUnits(userId: number): Promise<schema.Unit[]> {
    return await db
      .select()
      .from(schema.units)
      .where(eq(schema.units.userId, userId))
      .orderBy(asc(schema.units.createdAt));
  }

  async getUnit(id: number, userId: number): Promise<schema.Unit | undefined> {
    const result = await db
      .select()
      .from(schema.units)
      .where(and(eq(schema.units.id, id), eq(schema.units.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createUnit(unitData: schema.InsertUnit): Promise<schema.Unit> {
    const result = await db.insert(schema.units).values(unitData).returning();
    return result[0];
  }

  async updateUnit(id: number, unitData: Partial<schema.InsertUnit>, userId: number): Promise<schema.Unit> {
    const result = await db
      .update(schema.units)
      .set(unitData)
      .where(and(eq(schema.units.id, id), eq(schema.units.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteUnit(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.units)
      .where(and(eq(schema.units.id, id), eq(schema.units.userId, userId)));
    return result.changes > 0;
  }

  // Documents (user-specific)
  async getDocuments(userId: number): Promise<schema.Document[]> {
    return await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.userId, userId))
      .orderBy(desc(schema.documents.uploadedAt));
  }

  async getDocumentsByUnit(unitId: number, userId: number): Promise<schema.Document[]> {
    return await db
      .select()
      .from(schema.documents)
      .where(and(eq(schema.documents.unitId, unitId), eq(schema.documents.userId, userId)))
      .orderBy(desc(schema.documents.uploadedAt));
  }

  async getDocument(id: number, userId: number): Promise<schema.Document | undefined> {
    const result = await db
      .select()
      .from(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createDocument(documentData: schema.InsertDocument): Promise<schema.Document> {
    const result = await db.insert(schema.documents).values(documentData).returning();
    return result[0];
  }

  async updateDocument(id: number, documentData: Partial<schema.InsertDocument>, userId: number): Promise<schema.Document> {
    const result = await db
      .update(schema.documents)
      .set(documentData)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteDocument(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.documents)
      .where(and(eq(schema.documents.id, id), eq(schema.documents.userId, userId)));
    return result.changes > 0;
  }

  // Notes (user-specific)
  async getNotesByDocument(documentId: number, userId: number): Promise<schema.Note[]> {
    return await db
      .select()
      .from(schema.notes)
      .where(and(eq(schema.notes.documentId, documentId), eq(schema.notes.userId, userId)))
      .orderBy(desc(schema.notes.updatedAt));
  }

  async getNote(id: number, userId: number): Promise<schema.Note | undefined> {
    const result = await db
      .select()
      .from(schema.notes)
      .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createNote(noteData: schema.InsertNote): Promise<schema.Note> {
    const result = await db.insert(schema.notes).values(noteData).returning();
    return result[0];
  }

  async updateNote(id: number, noteData: Partial<schema.InsertNote>, userId: number): Promise<schema.Note> {
    const result = await db
      .update(schema.notes)
      .set({ ...noteData, updatedAt: new Date() })
      .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteNote(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.notes)
      .where(and(eq(schema.notes.id, id), eq(schema.notes.userId, userId)));
    return result.changes > 0;
  }

  // Assignments (user-specific)
  async getAssignments(userId: number): Promise<schema.Assignment[]> {
    return await db
      .select()
      .from(schema.assignments)
      .where(eq(schema.assignments.userId, userId))
      .orderBy(asc(schema.assignments.deadline));
  }

  async getAssignmentsByUnit(unitId: number, userId: number): Promise<schema.Assignment[]> {
    return await db
      .select()
      .from(schema.assignments)
      .where(and(eq(schema.assignments.unitId, unitId), eq(schema.assignments.userId, userId)))
      .orderBy(asc(schema.assignments.deadline));
  }

  async getAssignment(id: number, userId: number): Promise<schema.Assignment | undefined> {
    const result = await db
      .select()
      .from(schema.assignments)
      .where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createAssignment(assignmentData: schema.InsertAssignment): Promise<schema.Assignment> {
    const result = await db.insert(schema.assignments).values(assignmentData).returning();
    return result[0];
  }

  async updateAssignment(id: number, assignmentData: Partial<schema.InsertAssignment>, userId: number): Promise<schema.Assignment> {
    const result = await db
      .update(schema.assignments)
      .set(assignmentData)
      .where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteAssignment(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.assignments)
      .where(and(eq(schema.assignments.id, id), eq(schema.assignments.userId, userId)));
    return result.changes > 0;
  }

  // Study Plans (user-specific)
  async getStudyPlans(userId: number): Promise<schema.StudyPlan[]> {
    return await db
      .select()
      .from(schema.studyPlans)
      .where(eq(schema.studyPlans.userId, userId))
      .orderBy(desc(schema.studyPlans.date));
  }

  async getStudyPlan(id: number, userId: number): Promise<schema.StudyPlan | undefined> {
    const result = await db
      .select()
      .from(schema.studyPlans)
      .where(and(eq(schema.studyPlans.id, id), eq(schema.studyPlans.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createStudyPlan(studyPlanData: schema.InsertStudyPlan): Promise<schema.StudyPlan> {
    const result = await db.insert(schema.studyPlans).values(studyPlanData).returning();
    return result[0];
  }

  async updateStudyPlan(id: number, studyPlanData: Partial<schema.InsertStudyPlan>, userId: number): Promise<schema.StudyPlan> {
    const result = await db
      .update(schema.studyPlans)
      .set(studyPlanData)
      .where(and(eq(schema.studyPlans.id, id), eq(schema.studyPlans.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteStudyPlan(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.studyPlans)
      .where(and(eq(schema.studyPlans.id, id), eq(schema.studyPlans.userId, userId)));
    return result.changes > 0;
  }

  // AI Chats (user-specific)
  async getAiChats(userId: number): Promise<schema.AiChat[]> {
    return await db
      .select()
      .from(schema.aiChats)
      .where(eq(schema.aiChats.userId, userId))
      .orderBy(desc(schema.aiChats.updatedAt));
  }

  async getAiChat(id: number, userId: number): Promise<schema.AiChat | undefined> {
    const result = await db
      .select()
      .from(schema.aiChats)
      .where(and(eq(schema.aiChats.id, id), eq(schema.aiChats.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createAiChat(aiChatData: schema.InsertAiChat): Promise<schema.AiChat> {
    const result = await db.insert(schema.aiChats).values(aiChatData).returning();
    return result[0];
  }

  async updateAiChat(id: number, aiChatData: Partial<schema.InsertAiChat>, userId: number): Promise<schema.AiChat> {
    const result = await db
      .update(schema.aiChats)
      .set({ ...aiChatData, updatedAt: new Date() })
      .where(and(eq(schema.aiChats.id, id), eq(schema.aiChats.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteAiChat(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.aiChats)
      .where(and(eq(schema.aiChats.id, id), eq(schema.aiChats.userId, userId)));
    return result.changes > 0;
  }

  // Unit Progress (user-specific)
  async getUnitProgress(userId: number): Promise<schema.UnitProgress[]> {
    return await db
      .select()
      .from(schema.unitProgress)
      .where(eq(schema.unitProgress.userId, userId))
      .orderBy(desc(schema.unitProgress.lastUpdated));
  }

  async getUnitProgressByUnit(unitId: number, userId: number): Promise<schema.UnitProgress | undefined> {
    const result = await db
      .select()
      .from(schema.unitProgress)
      .where(and(eq(schema.unitProgress.unitId, unitId), eq(schema.unitProgress.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createUnitProgress(unitProgressData: schema.InsertUnitProgress): Promise<schema.UnitProgress> {
    const result = await db.insert(schema.unitProgress).values(unitProgressData).returning();
    return result[0];
  }

  async updateUnitProgress(id: number, unitProgressData: Partial<schema.InsertUnitProgress>, userId: number): Promise<schema.UnitProgress> {
    const result = await db
      .update(schema.unitProgress)
      .set({ ...unitProgressData, lastUpdated: new Date() })
      .where(and(eq(schema.unitProgress.id, id), eq(schema.unitProgress.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteUnitProgress(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.unitProgress)
      .where(and(eq(schema.unitProgress.id, id), eq(schema.unitProgress.userId, userId)));
    return result.changes > 0;
  }

  // Music (user-specific)
  async getMusic(userId: number): Promise<schema.Music[]> {
    return await db
      .select()
      .from(schema.music)
      .where(eq(schema.music.userId, userId))
      .orderBy(desc(schema.music.uploadedAt));
  }

  async getMusicById(id: number, userId: number): Promise<schema.Music | undefined> {
    const result = await db
      .select()
      .from(schema.music)
      .where(and(eq(schema.music.id, id), eq(schema.music.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createMusic(musicData: schema.InsertMusic): Promise<schema.Music> {
    const result = await db.insert(schema.music).values(musicData).returning();
    return result[0];
  }

  async updateMusic(id: number, musicData: Partial<schema.InsertMusic>, userId: number): Promise<schema.Music> {
    const result = await db
      .update(schema.music)
      .set(musicData)
      .where(and(eq(schema.music.id, id), eq(schema.music.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteMusic(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.music)
      .where(and(eq(schema.music.id, id), eq(schema.music.userId, userId)));
    return result.changes > 0;
  }

  // Quizzes (user-specific)
  async getQuizzes(userId: number): Promise<schema.Quiz[]> {
    return await db
      .select()
      .from(schema.quizzes)
      .where(eq(schema.quizzes.userId, userId))
      .orderBy(desc(schema.quizzes.createdAt));
  }

  async getQuizzesByUnit(unitId: number, userId: number): Promise<schema.Quiz[]> {
    return await db
      .select()
      .from(schema.quizzes)
      .where(and(eq(schema.quizzes.unitId, unitId), eq(schema.quizzes.userId, userId)))
      .orderBy(desc(schema.quizzes.createdAt));
  }

  async getQuiz(id: number, userId: number): Promise<schema.Quiz | undefined> {
    const result = await db
      .select()
      .from(schema.quizzes)
      .where(and(eq(schema.quizzes.id, id), eq(schema.quizzes.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createQuiz(quizData: schema.InsertQuiz): Promise<schema.Quiz> {
    const result = await db.insert(schema.quizzes).values(quizData).returning();
    return result[0];
  }

  async updateQuiz(id: number, quizData: Partial<schema.InsertQuiz>, userId: number): Promise<schema.Quiz> {
    const result = await db
      .update(schema.quizzes)
      .set(quizData)
      .where(and(eq(schema.quizzes.id, id), eq(schema.quizzes.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteQuiz(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.quizzes)
      .where(and(eq(schema.quizzes.id, id), eq(schema.quizzes.userId, userId)));
    return result.changes > 0;
  }

  // Quiz Attempts (user-specific)
  async getQuizAttempts(userId: number): Promise<schema.QuizAttempt[]> {
    return await db
      .select()
      .from(schema.quizAttempts)
      .where(eq(schema.quizAttempts.userId, userId))
      .orderBy(desc(schema.quizAttempts.createdAt));
  }

  async getQuizAttemptsByQuiz(quizId: number, userId: number): Promise<schema.QuizAttempt[]> {
    return await db
      .select()
      .from(schema.quizAttempts)
      .where(and(eq(schema.quizAttempts.quizId, quizId), eq(schema.quizAttempts.userId, userId)))
      .orderBy(desc(schema.quizAttempts.createdAt));
  }

  async getQuizAttempt(id: number, userId: number): Promise<schema.QuizAttempt | undefined> {
    const result = await db
      .select()
      .from(schema.quizAttempts)
      .where(and(eq(schema.quizAttempts.id, id), eq(schema.quizAttempts.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createQuizAttempt(quizAttemptData: schema.InsertQuizAttempt): Promise<schema.QuizAttempt> {
    const result = await db.insert(schema.quizAttempts).values(quizAttemptData).returning();
    return result[0];
  }

  async updateQuizAttempt(id: number, quizAttemptData: Partial<schema.InsertQuizAttempt>, userId: number): Promise<schema.QuizAttempt> {
    const result = await db
      .update(schema.quizAttempts)
      .set(quizAttemptData)
      .where(and(eq(schema.quizAttempts.id, id), eq(schema.quizAttempts.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteQuizAttempt(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(schema.quizAttempts)
      .where(and(eq(schema.quizAttempts.id, id), eq(schema.quizAttempts.userId, userId)));
    return result.changes > 0;
  }

  // AI Chat specific methods
  async getAiChatBySession(sessionId: string, userId: number): Promise<schema.AiChat | undefined> {
    const result = await db
      .select()
      .from(schema.aiChats)
      .where(and(eq(schema.aiChats.sessionId, sessionId), eq(schema.aiChats.userId, userId)))
      .limit(1);
    return result[0];
  }

  // Study Plan specific methods
  async getStudyPlanByDate(date: Date, userId: number): Promise<schema.StudyPlan | undefined> {
    const result = await db
      .select()
      .from(schema.studyPlans)
      .where(and(eq(schema.studyPlans.date, date), eq(schema.studyPlans.userId, userId)))
      .limit(1);
    return result[0];
  }
}

export const storage = new SQLiteStorage();

