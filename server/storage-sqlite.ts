import { db } from './database';
import * as schema from '../shared/schema';
import { eq, and, desc, asc, ne, or, like, count } from 'drizzle-orm';
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

  async updateUserPassword(userId: number, hashedPassword: string): Promise<void> {
    await db
      .update(schema.users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(schema.users.id, userId));
  }

  // OTP Management (using a simple in-memory store for now)
  private otpStore = new Map<string, { otp: string; expiresAt: Date; attempts: number }>();

  async storeOTP(otpData: { email: string; otp: string; expiresAt: Date; attempts: number }): Promise<void> {
    this.otpStore.set(otpData.email, {
      otp: otpData.otp,
      expiresAt: otpData.expiresAt,
      attempts: otpData.attempts
    });
  }

  async getOTP(email: string): Promise<{ otp: string; expiresAt: Date; attempts: number } | undefined> {
    return this.otpStore.get(email);
  }

  async deleteOTP(email: string): Promise<void> {
    this.otpStore.delete(email);
  }

  async incrementOTPAttempts(email: string): Promise<void> {
    const otpData = this.otpStore.get(email);
    if (otpData) {
      otpData.attempts++;
      this.otpStore.set(email, otpData);
    }
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

  // Friends
  async sendFriendRequest(userId: number, friendId: number): Promise<schema.Friend> {
    // Check if there's already a friendship or pending request
    const existingFriendship = await db
      .select()
      .from(schema.friends)
      .where(
        or(
          and(eq(schema.friends.userId, userId), eq(schema.friends.friendId, friendId)),
          and(eq(schema.friends.userId, friendId), eq(schema.friends.friendId, userId))
        )
      )
      .limit(1);

    if (existingFriendship.length > 0) {
      throw new Error('Friend request already exists or users are already friends');
    }

    const result = await db
      .insert(schema.friends)
      .values({ userId, friendId, status: 'pending' })
      .returning();
    return result[0];
  }

  async acceptFriendRequest(userId: number, friendId: number): Promise<schema.Friend> {
    console.log(`✅ Accepting friend request: userId=${userId}, friendId=${friendId}`);
    
    // Update the existing friend request to accepted
    // friendId sent the request TO userId, so we look for: userId=friendId, friendId=userId
    const result = await db
      .update(schema.friends)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(and(eq(schema.friends.userId, friendId), eq(schema.friends.friendId, userId)))
      .returning();

    console.log(`📝 Updated friend request result:`, result);

    // Create the reverse friendship for the accepting user
    await db
      .insert(schema.friends)
      .values({
        userId: userId,
        friendId: friendId,
        status: 'accepted'
      });

    console.log(`🔄 Created reverse friendship: userId=${userId}, friendId=${friendId}`);
    return result[0];
  }

  async rejectFriendRequest(userId: number, friendId: number): Promise<void> {
    console.log(`❌ Rejecting friend request: userId=${userId}, friendId=${friendId}`);
    
    const result = await db
      .delete(schema.friends)
      .where(and(eq(schema.friends.userId, friendId), eq(schema.friends.friendId, userId)))
      .returning();
    
    console.log(`🗑️ Deleted friend request result:`, result);
  }

  async getFriends(userId: number): Promise<Array<schema.User & { friendStatus: string }>> {
    const result = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        name: schema.users.name,
        avatar: schema.users.avatar,
        bio: schema.users.bio,
        location: schema.users.location,
        isActive: schema.users.isActive,
        lastLoginDate: schema.users.lastLoginDate,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        learningPace: schema.users.learningPace,
        studyStreak: schema.users.studyStreak,
        emailVerified: schema.users.emailVerified,
        phone: schema.users.phone,
        friendStatus: schema.friends.status,
      })
      .from(schema.friends)
      .innerJoin(schema.users, eq(schema.friends.friendId, schema.users.id))
      .where(and(eq(schema.friends.userId, userId), eq(schema.friends.status, 'accepted')));
    return result;
  }

  async getPendingFriendRequests(userId: number): Promise<Array<schema.User & { friendStatus: string }>> {
    console.log(`🔍 Fetching pending friend requests for user ${userId}`);
    
    const result = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        name: schema.users.name,
        avatar: schema.users.avatar,
        bio: schema.users.bio,
        location: schema.users.location,
        isActive: schema.users.isActive,
        lastLoginDate: schema.users.lastLoginDate,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        learningPace: schema.users.learningPace,
        studyStreak: schema.users.studyStreak,
        emailVerified: schema.users.emailVerified,
        phone: schema.users.phone,
        friendStatus: schema.friends.status,
      })
      .from(schema.friends)
      .innerJoin(schema.users, eq(schema.friends.userId, schema.users.id))
      .where(and(eq(schema.friends.friendId, userId), eq(schema.friends.status, 'pending')));
    
    console.log(`📋 Found ${result.length} pending requests for user ${userId}:`, result.map(r => ({ id: r.id, name: r.name, status: r.friendStatus })));
    return result;
  }

  async getSentFriendRequests(userId: number): Promise<Array<schema.User & { friendStatus: string }>> {
    const result = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        name: schema.users.name,
        avatar: schema.users.avatar,
        bio: schema.users.bio,
        location: schema.users.location,
        isActive: schema.users.isActive,
        lastLoginDate: schema.users.lastLoginDate,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        learningPace: schema.users.learningPace,
        studyStreak: schema.users.studyStreak,
        emailVerified: schema.users.emailVerified,
        phone: schema.users.phone,
        friendStatus: schema.friends.status,
      })
      .from(schema.friends)
      .innerJoin(schema.users, eq(schema.friends.friendId, schema.users.id))
      .where(and(eq(schema.friends.userId, userId), eq(schema.friends.status, 'pending')));
    return result;
  }

  async deleteFriendRequest(userId: number, friendId: number): Promise<void> {
    await db
      .delete(schema.friends)
      .where(
        and(
          eq(schema.friends.userId, userId),
          eq(schema.friends.friendId, friendId)
        )
      );
  }

  async getAllFriendRequests(userId: number): Promise<Array<schema.User & { friendStatus: string; requestType: 'sent' | 'received' }>> {
    try {
      // Get sent requests - where current user is the sender AND status is pending
      const sentRequests = await db
        .select()
        .from(schema.friends)
        .innerJoin(schema.users, eq(schema.friends.friendId, schema.users.id))
        .where(and(eq(schema.friends.userId, userId), eq(schema.friends.status, 'pending')));

      // Get received requests - where current user is the receiver AND status is pending
      const receivedRequests = await db
        .select()
        .from(schema.friends)
        .innerJoin(schema.users, eq(schema.friends.userId, schema.users.id))
        .where(and(eq(schema.friends.friendId, userId), eq(schema.friends.status, 'pending')));


      // Transform the results
      const allRequests = [
        ...sentRequests.map(req => ({
          ...req.users,
          friendStatus: req.friends.status,
          requestType: 'sent' as const,
        })),
        ...receivedRequests.map(req => ({
          ...req.users,
          friendStatus: req.friends.status,
          requestType: 'received' as const,
        }))
      ];

      return allRequests;
    } catch (error) {
      console.error('Error in getAllFriendRequests:', error);
      return [];
    }
  }

  async searchUsers(query: string, currentUserId: number): Promise<schema.User[]> {
    // If query is empty or very short, return all users except current user
    if (!query || query.length < 1) {
      const result = await db
        .select()
        .from(schema.users)
        .where(
          and(
            ne(schema.users.id, currentUserId), // Exclude current user
            eq(schema.users.isActive, true) // Only active users
          )
        );
      return result;
    }

    // If query is provided, filter users
    const result = await db
      .select()
      .from(schema.users)
      .where(
        and(
          ne(schema.users.id, currentUserId), // Exclude current user
          eq(schema.users.isActive, true), // Only active users
          or(
            like(schema.users.username, `%${query}%`),
            like(schema.users.name, `%${query}%`),
            like(schema.users.email, `%${query}%`)
          )
        )
      );
    return result;
  }

  async areFriends(userId1: number, userId2: number): Promise<boolean> {
    const result = await db
      .select()
      .from(schema.friends)
      .where(
        and(
          or(
            and(eq(schema.friends.userId, userId1), eq(schema.friends.friendId, userId2)),
            and(eq(schema.friends.userId, userId2), eq(schema.friends.friendId, userId1))
          ),
          eq(schema.friends.status, 'accepted')
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async getFriendRequestStatus(userId: number, friendId: number): Promise<'none' | 'sent' | 'received' | 'accepted'> {
    console.log(`🔍 Getting friend request status: userId=${userId}, friendId=${friendId}`);
    
    const result = await db
      .select()
      .from(schema.friends)
      .where(
        or(
          and(eq(schema.friends.userId, userId), eq(schema.friends.friendId, friendId)),
          and(eq(schema.friends.userId, friendId), eq(schema.friends.friendId, userId))
        )
      )
      .limit(1);

    console.log(`📊 Friend request status query result:`, result);

    if (result.length === 0) {
      console.log(`❌ No friend request found - returning 'none'`);
      return 'none';
    }

    const request = result[0];
    console.log(`📋 Found friend request:`, request);
    
    if (request.status === 'accepted') {
      console.log(`✅ Status: accepted`);
      return 'accepted';
    } else if (request.userId === userId) {
      console.log(`📤 Status: sent (userId matches)`);
      return 'sent';
    } else {
      console.log(`📥 Status: received (userId doesn't match)`);
      return 'received';
    }
  }

  // Messages
  async sendMessage(messageData: schema.InsertMessage): Promise<schema.Message> {
    const result = await db.insert(schema.messages).values(messageData).returning();
    return result[0];
  }

  async getMessages(userId: number, friendId: number): Promise<schema.Message[]> {
    const result = await db
      .select()
      .from(schema.messages)
      .where(
        and(
          // Messages where user is sender and friend is receiver
          eq(schema.messages.senderId, userId),
          eq(schema.messages.receiverId, friendId)
        )
      )
      .orderBy(asc(schema.messages.createdAt));
    return result;
  }

  async getConversations(userId: number): Promise<Array<schema.User & { lastMessage: schema.Message | null; unreadCount: number }>> {
    try {
      // Get all accepted friends for the user
      const friends = await db
        .select({
          id: schema.users.id,
          username: schema.users.username,
          email: schema.users.email,
          name: schema.users.name,
          avatar: schema.users.avatar,
          bio: schema.users.bio,
          location: schema.users.location,
          isActive: schema.users.isActive,
          lastLoginDate: schema.users.lastLoginDate,
          createdAt: schema.users.createdAt,
          updatedAt: schema.users.updatedAt,
          learningPace: schema.users.learningPace,
          studyStreak: schema.users.studyStreak,
          emailVerified: schema.users.emailVerified,
          phone: schema.users.phone,
        })
        .from(schema.friends)
        .innerJoin(schema.users, eq(schema.friends.friendId, schema.users.id))
        .where(and(eq(schema.friends.userId, userId), eq(schema.friends.status, 'accepted')));

      // For each friend, get the last message and unread count
      const conversations = await Promise.all(
        friends.map(async (friend) => {
          try {
            const lastMessage = await db
              .select()
              .from(schema.messages)
              .where(
                or(
                  and(eq(schema.messages.senderId, userId), eq(schema.messages.receiverId, friend.id)),
                  and(eq(schema.messages.senderId, friend.id), eq(schema.messages.receiverId, userId))
                )
              )
              .orderBy(desc(schema.messages.createdAt))
              .limit(1);

            const unreadCount = await db
              .select({ count: count() })
              .from(schema.messages)
              .where(
                and(
                  eq(schema.messages.senderId, friend.id),
                  eq(schema.messages.receiverId, userId),
                  eq(schema.messages.isRead, false)
                )
              );

            return {
              ...friend,
              lastMessage: lastMessage[0] || null,
              unreadCount: unreadCount[0]?.count || 0,
            };
          } catch (error) {
            console.error(`Error getting conversation for friend ${friend.id}:`, error);
            return {
              ...friend,
              lastMessage: null,
              unreadCount: 0,
            };
          }
        })
      );

      return conversations;
    } catch (error) {
      console.error('Error in getConversations:', error);
      return [];
    }
  }

  async markMessagesAsRead(userId: number, senderId: number): Promise<void> {
    await db
      .update(schema.messages)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(schema.messages.receiverId, userId), eq(schema.messages.senderId, senderId)));
  }

  // Groups
  async createGroup(groupData: schema.InsertGroup, createdBy: number): Promise<schema.Group> {
    const result = await db.insert(schema.groups).values({ ...groupData, createdBy }).returning();
    return result[0];
  }

  async addGroupMember(groupId: number, userId: number, role: string = 'member'): Promise<schema.GroupMember> {
    const result = await db
      .insert(schema.groupMembers)
      .values({ groupId, userId, role })
      .returning();
    return result[0];
  }

  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    await db
      .delete(schema.groupMembers)
      .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)));
  }

  async getUserGroups(userId: number): Promise<Array<schema.Group & { memberCount: number; lastMessage?: schema.Message }>> {
    const result = await db
      .select({
        id: schema.groups.id,
        name: schema.groups.name,
        description: schema.groups.description,
        avatar: schema.groups.avatar,
        createdBy: schema.groups.createdBy,
        isActive: schema.groups.isActive,
        createdAt: schema.groups.createdAt,
        updatedAt: schema.groups.updatedAt,
        memberCount: 0, // This would need a proper count query
        lastMessage: schema.messages,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.groups, eq(schema.groupMembers.groupId, schema.groups.id))
      .leftJoin(schema.messages, eq(schema.messages.groupId, schema.groups.id))
      .where(and(eq(schema.groupMembers.userId, userId), eq(schema.groups.isActive, true)));
    return result;
  }

  async getGroupMembers(groupId: number): Promise<Array<schema.User & { role: string }>> {
    const result = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        name: schema.users.name,
        avatar: schema.users.avatar,
        bio: schema.users.bio,
        location: schema.users.location,
        isActive: schema.users.isActive,
        lastLoginDate: schema.users.lastLoginDate,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        learningPace: schema.users.learningPace,
        studyStreak: schema.users.studyStreak,
        emailVerified: schema.users.emailVerified,
        phone: schema.users.phone,
        role: schema.groupMembers.role,
      })
      .from(schema.groupMembers)
      .innerJoin(schema.users, eq(schema.groupMembers.userId, schema.users.id))
      .where(eq(schema.groupMembers.groupId, groupId));
    return result;
  }

  async getGroupMessages(groupId: number): Promise<schema.Message[]> {
    const result = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.groupId, groupId))
      .orderBy(asc(schema.messages.createdAt));
    return result;
  }

  async isUserInGroup(userId: number, groupId: number): Promise<boolean> {
    const result = await db
      .select()
      .from(schema.groupMembers)
      .where(and(eq(schema.groupMembers.userId, userId), eq(schema.groupMembers.groupId, groupId)))
      .limit(1);
    return result.length > 0;
  }

  async updateGroup(groupId: number, groupData: Partial<schema.InsertGroup>): Promise<schema.Group> {
    const result = await db
      .update(schema.groups)
      .set({ ...groupData, updatedAt: new Date() })
      .where(eq(schema.groups.id, groupId))
      .returning();
    return result[0];
  }

  async deleteGroup(groupId: number): Promise<void> {
    await db.delete(schema.groups).where(eq(schema.groups.id, groupId));
  }

  // Notifications
  async createNotification(notification: schema.InsertNotification): Promise<schema.Notification> {
    const [result] = await db.insert(schema.notifications).values(notification).returning();
    return result;
  }

  async getNotifications(userId: number, limit: number = 50): Promise<schema.Notification[]> {
    return await db
      .select()
      .from(schema.notifications)
      .where(eq(schema.notifications.userId, userId))
      .orderBy(desc(schema.notifications.createdAt))
      .limit(limit);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(schema.notifications)
      .where(and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      ));
    
    return result[0]?.count || 0;
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.id, notificationId));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(schema.notifications)
      .set({ isRead: true })
      .where(eq(schema.notifications.userId, userId));
  }

  // Data export methods
  async getUserDocuments(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.userId, userId));
  }

  async getUserUnits(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(schema.units)
      .where(eq(schema.units.userId, userId));
  }

  async getUserProgress(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(schema.unitProgress)
      .where(eq(schema.unitProgress.userId, userId));
  }

  async getUserFriends(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(schema.friends)
      .where(eq(schema.friends.userId, userId));
  }

  // Account deletion method
  async deleteUserAccount(userId: number): Promise<void> {
    console.log(`🗑️ Starting complete account deletion for user ${userId}`);
    
    // Delete in order to respect foreign key constraints
    // 1. Delete notifications
    await db.delete(schema.notifications).where(eq(schema.notifications.userId, userId));
    console.log(`🗑️ Deleted notifications for user ${userId}`);
    
    // 2. Delete friends relationships (both directions)
    await db.delete(schema.friends).where(eq(schema.friends.userId, userId));
    await db.delete(schema.friends).where(eq(schema.friends.friendId, userId));
    console.log(`🗑️ Deleted friend relationships for user ${userId}`);
    
    // 3. Delete unit progress
    await db.delete(schema.unitProgress).where(eq(schema.unitProgress.userId, userId));
    console.log(`🗑️ Deleted unit progress for user ${userId}`);
    
    // 4. Delete documents
    await db.delete(schema.documents).where(eq(schema.documents.userId, userId));
    console.log(`🗑️ Deleted documents for user ${userId}`);
    
    // 5. Delete units
    await db.delete(schema.units).where(eq(schema.units.userId, userId));
    console.log(`🗑️ Deleted units for user ${userId}`);
    
    // 6. Finally delete the user
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    console.log(`🗑️ Deleted user account ${userId}`);
    
    console.log(`✅ Complete account deletion finished for user ${userId}`);
  }
}

export const storage = new SQLiteStorage();

