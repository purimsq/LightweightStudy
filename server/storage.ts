import { 
  users, units, documents, notes, assignments, studyPlans, aiChats, unitProgress,
  type User, type InsertUser,
  type Unit, type InsertUnit,
  type Document, type InsertDocument,
  type Note, type InsertNote,
  type Assignment, type InsertAssignment,
  type StudyPlan, type InsertStudyPlan,
  type AiChat, type InsertAiChat,
  type UnitProgress, type InsertUnitProgress
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;

  // Units
  getUnits(): Promise<Unit[]>;
  getUnit(id: number): Promise<Unit | undefined>;
  createUnit(unit: InsertUnit): Promise<Unit>;
  updateUnit(id: number, unit: Partial<InsertUnit>): Promise<Unit>;
  deleteUnit(id: number): Promise<boolean>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocumentsByUnit(unitId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<boolean>;

  // Notes
  getNotesByDocument(documentId: number): Promise<Note[]>;
  getNote(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number): Promise<boolean>;

  // Assignments
  getAssignments(): Promise<Assignment[]>;
  getAssignment(id: number): Promise<Assignment | undefined>;
  createAssignment(assignment: InsertAssignment): Promise<Assignment>;
  updateAssignment(id: number, assignment: Partial<InsertAssignment>): Promise<Assignment>;
  deleteAssignment(id: number): Promise<boolean>;

  // Study Plans
  getStudyPlans(): Promise<StudyPlan[]>;
  getStudyPlanByDate(date: Date): Promise<StudyPlan | undefined>;
  createStudyPlan(plan: InsertStudyPlan): Promise<StudyPlan>;
  updateStudyPlan(id: number, plan: Partial<InsertStudyPlan>): Promise<StudyPlan>;

  // AI Chats
  getAiChats(): Promise<AiChat[]>;
  getAiChatBySession(sessionId: string): Promise<AiChat | undefined>;
  createAiChat(chat: InsertAiChat): Promise<AiChat>;
  updateAiChat(id: number, chat: Partial<InsertAiChat>): Promise<AiChat>;

  // Quiz
  getQuiz(documentId: number): Promise<any>;
  saveQuiz(documentId: number, quiz: any): Promise<any>;

  // Unit Progress
  getUnitProgress(): Promise<UnitProgress[]>;
  getUnitProgressByUnit(unitId: number): Promise<UnitProgress | undefined>;
  createUnitProgress(progress: InsertUnitProgress): Promise<UnitProgress>;
  updateUnitProgress(id: number, progress: Partial<InsertUnitProgress>): Promise<UnitProgress>;
  deleteUnitProgress(unitId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private units: Map<number, Unit> = new Map();
  private documents: Map<number, Document> = new Map();
  private notes: Map<number, Note> = new Map();
  private assignments: Map<number, Assignment> = new Map();
  private studyPlans: Map<number, StudyPlan> = new Map();
  private aiChats: Map<number, AiChat> = new Map();
  private unitProgress: Map<number, UnitProgress> = new Map();
  private quizzes: Map<number, any> = new Map(); // documentId -> quiz
  private currentId: number = 1;

  constructor() {
    // Initialize with default user
    this.createUser({
      username: "mitchell",
      name: "Mitchell",
      learningPace: 45,
      studyStreak: 0,
    });

    // Initialize with sample units
    const anatomyUnit = this.createUnit({
      name: "Anatomy",
      description: "Human body systems and structures",
      color: "green",
      icon: "user-md",
      totalTopics: 5,
      completedTopics: 3,
    });

    const immunologyUnit = this.createUnit({
      name: "Immunology", 
      description: "Immune system and defense mechanisms",
      color: "yellow",
      icon: "shield-alt",
      totalTopics: 5,
      completedTopics: 1,
    });

    const physiologyUnit = this.createUnit({
      name: "Physiology",
      description: "Body functions and processes", 
      color: "blue",
      icon: "heartbeat",
      totalTopics: 5,
      completedTopics: 2,
    });

    // Create progress bars for initial units
    anatomyUnit.then(async unit => {
      try {
        await this.createUnitProgress({
          unitId: unit.id,
          progressPercentage: 60,
          weeklyImprovement: 15,
          trend: "up"
        });
      } catch (error) {
        console.error(`Failed to create progress for unit ${unit.id}:`, error);
      }
    });

    immunologyUnit.then(async unit => {
      try {
        await this.createUnitProgress({
          unitId: unit.id,
          progressPercentage: 20,
          weeklyImprovement: -5,
          trend: "down"
        });
      } catch (error) {
        console.error(`Failed to create progress for unit ${unit.id}:`, error);
      }
    });

    physiologyUnit.then(async unit => {
      try {
        await this.createUnitProgress({
          unitId: unit.id,
          progressPercentage: 40,
          weeklyImprovement: 10,
          trend: "up"
        });
      } catch (error) {
        console.error(`Failed to create progress for unit ${unit.id}:`, error);
      }
    });
  }

  private getNextId(): number {
    return this.currentId++;
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.getNextId();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      lastActiveDate: null,
      learningPace: insertUser.learningPace ?? 40,
      studyStreak: insertUser.studyStreak ?? 0,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) throw new Error("User not found");
    
    const updated: User = { ...existing, ...updateUser };
    this.users.set(id, updated);
    return updated;
  }

  // Units
  async getUnits(): Promise<Unit[]> {
    return Array.from(this.units.values());
  }

  async getUnit(id: number): Promise<Unit | undefined> {
    return this.units.get(id);
  }

  async createUnit(insertUnit: InsertUnit): Promise<Unit> {
    const id = this.getNextId();
    const unit: Unit = {
      ...insertUnit,
      color: insertUnit.color ?? "blue",
      description: insertUnit.description ?? null,
      completedTopics: insertUnit.completedTopics ?? 0,
      icon: insertUnit.icon ?? "book",
      totalTopics: insertUnit.totalTopics ?? 0,
      id,
      createdAt: new Date(),
    };
    this.units.set(id, unit);
    
    // Automatically create a progress bar for the new unit
    await this.createUnitProgress({
      unitId: id,
      progressPercentage: 0,
      weeklyImprovement: 0,
      trend: "stable"
    });
    
    return unit;
  }

  async updateUnit(id: number, updateUnit: Partial<InsertUnit>): Promise<Unit> {
    const existing = this.units.get(id);
    if (!existing) throw new Error("Unit not found");
    
    const updated: Unit = { ...existing, ...updateUnit };
    this.units.set(id, updated);
    return updated;
  }

  async deleteUnit(id: number): Promise<boolean> {
    // Also delete the associated progress bar
    await this.deleteUnitProgress(id);
    return this.units.delete(id);
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getDocumentsByUnit(unitId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(doc => doc.unitId === unitId);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.getNextId();
    const document: Document = {
      ...insertDocument,
      id,
      uploadedAt: new Date(),
      unitId: insertDocument.unitId ?? null,
      extractedText: insertDocument.extractedText ?? null,
      summary: insertDocument.summary ?? null,
      embeddings: insertDocument.embeddings ?? null,
      fileSize: insertDocument.fileSize ?? 0,
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: number, updateDocument: Partial<InsertDocument>): Promise<Document> {
    const existing = this.documents.get(id);
    if (!existing) throw new Error("Document not found");
    
    const updated: Document = { ...existing, ...updateDocument };
    this.documents.set(id, updated);
    return updated;
  }

  async deleteDocument(id: number): Promise<boolean> {
    return this.documents.delete(id);
  }

  // Notes
  async getNotesByDocument(documentId: number): Promise<Note[]> {
    return Array.from(this.notes.values()).filter(note => note.documentId === documentId);
  }

  async getNote(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async createNote(insertNote: InsertNote): Promise<Note> {
    const id = this.getNextId();
    const note: Note = {
      ...insertNote,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      documentId: insertNote.documentId ?? null,
      isMarkdown: insertNote.isMarkdown ?? false,
      title: insertNote.title ?? "Untitled Note",
    };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(id: number, updateNote: Partial<InsertNote>): Promise<Note> {
    const existing = this.notes.get(id);
    if (!existing) throw new Error("Note not found");
    
    const updated: Note = { ...existing, ...updateNote, updatedAt: new Date() };
    this.notes.set(id, updated);
    return updated;
  }

  async deleteNote(id: number): Promise<boolean> {
    return this.notes.delete(id);
  }

  // Assignments
  async getAssignments(): Promise<Assignment[]> {
    return Array.from(this.assignments.values());
  }

  async getAssignment(id: number): Promise<Assignment | undefined> {
    return this.assignments.get(id);
  }

  async createAssignment(insertAssignment: InsertAssignment): Promise<Assignment> {
    const id = this.getNextId();
    const assignment: Assignment = {
      ...insertAssignment,
      id,
      createdAt: new Date(),
      type: insertAssignment.type ?? "assignment",
      status: insertAssignment.status ?? "pending",
      description: insertAssignment.description ?? null,
      unitId: insertAssignment.unitId ?? null,
      questions: insertAssignment.questions ?? null,
      relatedDocuments: insertAssignment.relatedDocuments ?? null,
      attachedFilePath: insertAssignment.attachedFilePath ?? null,
      attachedFileName: insertAssignment.attachedFileName ?? null,
      attachedFileType: insertAssignment.attachedFileType ?? null,
      totalMarks: insertAssignment.totalMarks ?? null,
      userGrade: insertAssignment.userGrade ?? null,
      progressContribution: insertAssignment.progressContribution ?? null,
      ollamaResult: insertAssignment.ollamaResult ?? null,
    };
    this.assignments.set(id, assignment);
    return assignment;
  }

  async updateAssignment(id: number, updateAssignment: Partial<InsertAssignment>): Promise<Assignment> {
    const existing = this.assignments.get(id);
    if (!existing) throw new Error("Assignment not found");
    
    const updated: Assignment = { ...existing, ...updateAssignment };
    this.assignments.set(id, updated);
    return updated;
  }

  async deleteAssignment(id: number): Promise<boolean> {
    return this.assignments.delete(id);
  }

  // Study Plans
  async getStudyPlans(): Promise<StudyPlan[]> {
    return Array.from(this.studyPlans.values());
  }

  async getStudyPlanByDate(date: Date): Promise<StudyPlan | undefined> {
    return Array.from(this.studyPlans.values()).find(plan => 
      plan.date.toDateString() === date.toDateString()
    );
  }

  async createStudyPlan(insertStudyPlan: InsertStudyPlan): Promise<StudyPlan> {
    const id = this.getNextId();
    const studyPlan: StudyPlan = {
      ...insertStudyPlan,
      id,
      createdAt: new Date(),
      scheduledTopics: insertStudyPlan.scheduledTopics ?? [],
      completedTopics: insertStudyPlan.completedTopics ?? [],
      totalStudyTime: insertStudyPlan.totalStudyTime ?? 0,
      actualStudyTime: insertStudyPlan.actualStudyTime ?? 0,
      breaks: insertStudyPlan.breaks ?? [],
    };
    this.studyPlans.set(id, studyPlan);
    return studyPlan;
  }

  async updateStudyPlan(id: number, updateStudyPlan: Partial<InsertStudyPlan>): Promise<StudyPlan> {
    const existing = this.studyPlans.get(id);
    if (!existing) throw new Error("Study plan not found");
    
    const updated: StudyPlan = { ...existing, ...updateStudyPlan };
    this.studyPlans.set(id, updated);
    return updated;
  }

  // AI Chats
  async getAiChats(): Promise<AiChat[]> {
    return Array.from(this.aiChats.values());
  }

  async getAiChatBySession(sessionId: string): Promise<AiChat | undefined> {
    return Array.from(this.aiChats.values()).find(chat => chat.sessionId === sessionId);
  }

  async createAiChat(insertAiChat: InsertAiChat): Promise<AiChat> {
    const id = this.getNextId();
    const aiChat: AiChat = {
      ...insertAiChat,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.aiChats.set(id, aiChat);
    return aiChat;
  }

  async updateAiChat(id: number, updateAiChat: Partial<InsertAiChat>): Promise<AiChat> {
    const existing = this.aiChats.get(id);
    if (!existing) throw new Error("AI chat not found");
    
    const updated: AiChat = { ...existing, ...updateAiChat, updatedAt: new Date() };
    this.aiChats.set(id, updated);
    return updated;
  }

  // Quiz
  async getQuiz(documentId: number): Promise<any> {
    return this.quizzes.get(documentId);
  }

  async saveQuiz(documentId: number, quiz: any): Promise<any> {
    this.quizzes.set(documentId, quiz);
    return quiz;
  }

  // Unit Progress
  async getUnitProgress(): Promise<UnitProgress[]> {
    return Array.from(this.unitProgress.values());
  }

  async getUnitProgressByUnit(unitId: number): Promise<UnitProgress | undefined> {
    return Array.from(this.unitProgress.values()).find(progress => progress.unitId === unitId);
  }

  async createUnitProgress(insertProgress: InsertUnitProgress): Promise<UnitProgress> {
    const id = this.getNextId();
    const progress: UnitProgress = {
      ...insertProgress,
      id,
      lastUpdated: new Date(),
      createdAt: new Date(),
    };
    this.unitProgress.set(id, progress);
    return progress;
  }

  async updateUnitProgress(id: number, updateProgress: Partial<InsertUnitProgress>): Promise<UnitProgress> {
    const existing = this.unitProgress.get(id);
    if (!existing) throw new Error("Unit progress not found");
    
    const updated: UnitProgress = { 
      ...existing, 
      ...updateProgress,
      lastUpdated: new Date()
    };
    this.unitProgress.set(id, updated);
    return updated;
  }

  async deleteUnitProgress(unitId: number): Promise<boolean> {
    const progress = Array.from(this.unitProgress.values()).find(p => p.unitId === unitId);
    if (progress) {
      return this.unitProgress.delete(progress.id);
    }
    return false;
  }
}

export const storage = new MemStorage();
