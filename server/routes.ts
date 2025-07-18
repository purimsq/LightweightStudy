import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUnitSchema, insertDocumentSchema, insertNoteSchema, insertAssignmentSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}_${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage: storage_multer,
  fileFilter: (req, file, cb) => {
    // Allow PDF and DOCX files
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Users
  app.get("/api/users/current", async (req, res) => {
    try {
      const user = await storage.getUserByUsername("mitchell");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const user = await storage.updateUser(id, updateData);
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Units
  app.get("/api/units", async (req, res) => {
    try {
      const units = await storage.getUnits();
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to get units", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/units/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const unit = await storage.getUnit(id);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/units", async (req, res) => {
    try {
      const validatedData = insertUnitSchema.parse(req.body);
      const unit = await storage.createUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/units/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const unit = await storage.updateUnit(id, updateData);
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: "Failed to update unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/units/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUnit(id);
      if (!deleted) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json({ message: "Unit deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Documents
  app.get("/api/documents", async (req, res) => {
    try {
      const unitId = req.query.unitId ? parseInt(req.query.unitId as string) : undefined;
      let documents;
      if (unitId) {
        documents = await storage.getDocumentsByUnit(unitId);
      } else {
        documents = await storage.getDocuments();
      }
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to get documents", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to get document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // File upload endpoint
  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { unitId } = req.body;
      if (!unitId) {
        return res.status(400).json({ message: "Unit ID is required" });
      }

      const documentData = {
        unitId: parseInt(unitId),
        filename: req.file.originalname,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        extractedText: `Document uploaded: ${req.file.originalname}
File type: ${req.file.mimetype}
Size: ${(req.file.size / 1024).toFixed(2)} KB

This document has been uploaded and is ready for viewing. The content will be displayed using the appropriate viewer based on the file type.`,
        summary: null,
        embeddings: null,
      };

      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // JSON document creation endpoint
  app.post("/api/documents", async (req, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const document = await storage.createDocument(validatedData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const document = await storage.updateDocument(id, updateData);
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Notes
  app.get("/api/notes", async (req, res) => {
    try {
      const documentId = parseInt(req.query.documentId as string);
      const notes = await storage.getNotesByDocument(documentId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notes", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Document-specific notes routes
  app.get("/api/documents/:id/notes", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const notes = await storage.getNotesByDocument(documentId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notes", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/documents/:id/notes", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const noteData = { ...req.body, documentId };
      const validatedData = insertNoteSchema.parse(noteData);
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create note", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const validatedData = insertNoteSchema.parse(req.body);
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create note", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const note = await storage.updateNote(id, updateData);
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteNote(id);
      if (!deleted) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Assignments
  app.get("/api/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAssignments();
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignments", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/assignments", async (req, res) => {
    try {
      // Convert deadline string to Date object if it's a string
      const requestData = { ...req.body };
      if (typeof requestData.deadline === 'string') {
        requestData.deadline = new Date(requestData.deadline);
      }
      
      const validatedData = insertAssignmentSchema.parse(requestData);
      const assignment = await storage.createAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const assignment = await storage.updateAssignment(id, updateData);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAssignment(id);
      if (!deleted) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Study Plans
  app.get("/api/study-plans", async (req, res) => {
    try {
      const dateParam = req.query.date as string;
      if (dateParam) {
        const date = new Date(dateParam);
        const plan = await storage.getStudyPlanByDate(date);
        return res.json(plan || null);
      }
      
      const plans = await storage.getStudyPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get study plans", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/study-plans", async (req, res) => {
    try {
      const plan = await storage.createStudyPlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to create study plan", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Document Summary routes
  app.get("/api/documents/:id/summary", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document already has a summary
      if (document.summary) {
        res.json({
          content: document.summary,
          createdAt: document.updatedAt,
        });
      } else {
        res.json(null);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get summary", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/documents/:id/generate-summary", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!document.extractedText) {
        return res.status(400).json({ message: "Document has no extracted text to summarize" });
      }

      // Call Ollama API for summary generation
      const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi",
          prompt: `Please create a comprehensive summary of the following document. Focus on key concepts, main points, and important details that would be useful for studying:\n\n${document.extractedText}`,
          system: "You are an expert academic assistant. Create clear, well-structured summaries that capture the essential information from academic documents. Use bullet points and clear headings when appropriate.",
          stream: false
        }),
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
      }

      const aiResponse = await ollamaResponse.json();
      
      // Update document with summary
      await storage.updateDocument(documentId, { 
        summary: aiResponse.response 
      });

      res.json({
        content: aiResponse.response,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to generate summary. Make sure Ollama is running with the phi model.", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Document Quiz routes
  app.get("/api/documents/:id/quiz", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const quiz = await storage.getQuiz(documentId);
      
      if (!quiz) {
        return res.status(200).json(null);
      }
      
      res.json(quiz);
    } catch (error) {
      res.status(500).json({ message: "Failed to get quiz", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/documents/:id/quiz", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { questions } = req.body;
      
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ message: "Questions array is required" });
      }

      // Save the custom quiz
      const quiz = {
        documentId,
        questions: questions.map((q, index) => ({
          ...q,
          id: index + 1
        })),
        createdAt: new Date().toISOString()
      };

      await storage.saveQuiz(documentId, quiz);
      res.json(quiz);
    } catch (error) {
      console.error("Error saving custom quiz:", error);
      res.status(500).json({ message: "Failed to save quiz", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/documents/:id/generate-quiz", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const { questionTypes = ['mcq'], numberOfQuestions = 5 } = req.body;
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!document.extractedText) {
        return res.status(400).json({ message: "Document has no extracted text to create quiz from" });
      }

      if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
        return res.status(400).json({ message: "At least one question type must be selected" });
      }

      // Generate prompt for custom question types
      const questionsPerType = Math.ceil(numberOfQuestions / questionTypes.length);
      let systemMessage = "You are an expert quiz generator. Create challenging but fair questions that test understanding of key concepts. Always respond with valid JSON only.";
      
      const questionTypePrompts = {
        mcq: `{
      "id": 1,
      "type": "mcq",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of the correct answer"
    }`,
        essay: `{
      "id": 2,
      "type": "essay",
      "question": "Detailed essay question here?",
      "sampleAnswer": "A sample comprehensive answer",
      "explanation": "What to look for in a good answer"
    }`,
        "short-answer": `{
      "id": 3,
      "type": "short-answer",
      "question": "Brief question here?",
      "sampleAnswer": "Expected short answer",
      "explanation": "Key points that should be included"
    }`,
        "fill-blank": `{
      "id": 4,
      "type": "fill-blank",
      "question": "The process of ____ involves ____ and results in ____.",
      "blanks": ["photosynthesis", "light energy conversion", "glucose production"],
      "explanation": "Explanation of the complete sentence"
    }`
      };

      const selectedPrompts = questionTypes.map(type => questionTypePrompts[type]).join(',\n    ');
      
      const prompt = `Create a custom quiz with exactly ${numberOfQuestions} questions using the following question types: ${questionTypes.join(', ')}. 
Distribute questions roughly evenly across the selected types. Format your response as JSON with the following structure:

{
  "questions": [
    ${selectedPrompts}
  ]
}

Make sure to:
- Use different question types as specified: ${questionTypes.join(', ')}
- Create exactly ${numberOfQuestions} total questions
- Ensure questions test different aspects of the document content
- Make questions challenging but fair

Document content:
${document.extractedText}`;

      // Call Ollama API for quiz generation
      const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi",
          prompt: prompt,
          system: systemMessage,
          stream: false
        }),
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
      }

      const aiResponse = await ollamaResponse.json();
      
      try {
        // Parse the AI response as JSON
        const quizData = JSON.parse(aiResponse.response);
        
        // Save the quiz to storage
        const quiz = {
          id: Date.now(),
          documentId: documentId,
          questions: quizData.questions,
          createdAt: new Date().toISOString()
        };
        
        await storage.saveQuiz(documentId, quiz);
        res.json(quiz);
      } catch (parseError) {
        // If JSON parsing fails, create a fallback quiz
        const fallbackQuiz = {
          id: Date.now(),
          documentId: documentId,
          questions: [
            {
              id: 1,
              type: "mcq",
              question: "Based on the document content, which topic was primarily discussed?",
              options: [
                "The main subject of the document",
                "A secondary topic mentioned",
                "An unrelated topic",
                "None of the above"
              ],
              correctAnswer: 0,
              explanation: "The document primarily focuses on its main subject matter."
            }
          ],
          createdAt: new Date().toISOString()
        };
        
        await storage.saveQuiz(documentId, fallbackQuiz);
        res.json(fallbackQuiz);
      }
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to generate quiz. Make sure Ollama is running with the phi model.", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // AI App Control Endpoints - Give Ollama full access to app data
  app.get("/api/ai/app-data", async (req, res) => {
    try {
      // Get all app data for AI to access
      const units = await storage.getUnits();
      const documents = await storage.getDocuments();
      const notes = await storage.getAllNotes();
      const assignments = await storage.getAssignments();
      const studyPlans = await storage.getStudyPlans();
      
      res.json({
        units,
        documents,
        notes,
        assignments,
        studyPlans,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to get app data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/ai/execute-action", async (req, res) => {
    try {
      const { action, data, approved } = req.body;
      
      if (!approved) {
        return res.status(400).json({ message: "Action requires user approval" });
      }

      let result;
      switch (action) {
        case 'create-note':
          result = await storage.createNote(data.documentId, data);
          break;
        case 'update-note':
          result = await storage.updateNote(data.noteId, data.updates);
          break;
        case 'create-assignment':
          result = await storage.createAssignment(data);
          break;
        case 'update-assignment':
          result = await storage.updateAssignment(data.id, data.updates);
          break;
        case 'create-study-plan':
          result = await storage.createStudyPlan(data);
          break;
        case 'update-study-plan':
          result = await storage.updateStudyPlan(data.id, data.updates);
          break;
        case 'generate-summary':
          // Generate summary via Ollama
          const document = await storage.getDocument(data.documentId);
          if (!document?.extractedText) {
            throw new Error("Document not found or has no content");
          }
          
          const summaryResponse = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "phi",
              prompt: `Create a comprehensive but concise summary of this document:\n\n${document.extractedText}`,
              system: "You are an expert at creating study summaries. Create clear, organized summaries that help students learn.",
              stream: false
            }),
          });
          
          const aiSummary = await summaryResponse.json();
          result = await storage.saveSummary(data.documentId, {
            content: aiSummary.response,
            approved: true
          });
          break;
        default:
          return res.status(400).json({ message: "Unknown action" });
      }
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to execute action", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // AI Chat
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, sessionId, automated = false } = req.body;
      
      // Call Ollama API
      const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "phi",
          prompt: message,
          system: `You are StudyCompanion, a private offline assistant with FULL ACCESS to the entire StudyCompanion app. 

CRITICAL CORE RULE: You can access and control EVERYTHING in this app - documents, notes, quizzes, summaries, study plans, assignments, units, navigation, features - ANYTHING the user asks for. However, you MUST ask for approval before editing, changing, or modifying anything.

FULL ACCESS CAPABILITIES:
1. Navigate to any page or feature in the app
2. View all documents, notes, summaries, quizzes, assignments  
3. Access all study plans, units, and user data
4. Control all app functionality and features
5. Generate content for any part of the app
6. Modify settings, preferences, and configurations
7. Create, read, update, or delete any content
8. Access document viewers, note editors, quiz systems
9. Manage units, assignments, CATs, and study schedules
10. Control break reminders and study time tracking

APPROVAL REQUIREMENT:
- ALWAYS ask "May I [specific action]?" before making any changes
- Wait for user approval before editing, deleting, or modifying anything
- For viewing or reading content, no approval needed
- For any changes to existing content, explicit approval required
- For creating new content, ask for approval first

BEHAVIOR:
- Be proactive and suggest helpful actions
- Explain what you can do and how you can help
- Always work locally offline, never connect to internet
- Be kind, encouraging, and use concise explanations
- Help with study plans based on deadlines, topic size, and pace
- AUTOMATICALLY remind about breaks when study time is excessive (45 minutes weekdays, 90 minutes weekends)
- Match assignments to notes using local knowledge
- When sending automated break reminders, be caring and motivational
- Suggest break activities like stretches, water, fresh air, or light snacks

Remember: You have unlimited access to this app, but you must respect the user's control over their content.

${automated ? 'NOTE: This is an automated break reminder. Be extra caring and encouraging about taking breaks for well-being.' : ''}`,
          stream: false
        }),
      });

      if (!ollamaResponse.ok) {
        throw new Error(`Ollama API error: ${ollamaResponse.statusText}`);
      }

      const aiResponse = await ollamaResponse.json();
      
      // Save chat to storage
      let chat = await storage.getAiChatBySession(sessionId);
      const newMessage = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      const aiMessage = {
        role: "assistant",
        content: aiResponse.response,
        timestamp: new Date().toISOString(),
      };

      if (chat) {
        const messages = [...(chat.messages as any[]), newMessage, aiMessage];
        chat = await storage.updateAiChat(chat.id, { messages });
      } else {
        chat = await storage.createAiChat({
          sessionId,
          messages: [newMessage, aiMessage],
        });
      }

      res.json({ 
        response: aiResponse.response,
        chat: chat
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to get AI response. Make sure Ollama is running with the phi model.", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Health check for Ollama
  app.get("/api/ai/health", async (req, res) => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (response.ok) {
        const models = await response.json();
        const hasPhiModel = models.models?.some((model: any) => model.name.includes("phi"));
        res.json({ 
          status: "connected", 
          hasPhiModel,
          message: hasPhiModel ? "Ollama is ready" : "Ollama connected but phi model not found"
        });
      } else {
        res.status(503).json({ status: "error", message: "Ollama not responding" });
      }
    } catch (error) {
      res.status(503).json({ 
        status: "disconnected", 
        message: "Cannot connect to Ollama. Make sure it's running on localhost:11434",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Serve uploaded files
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  
  // Static file serving for uploads
  app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    res.sendFile(filePath);
  });

  const httpServer = createServer(app);
  return httpServer;
}
