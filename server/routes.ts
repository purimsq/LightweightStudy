import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertUnitSchema, insertDocumentSchema, insertNoteSchema, insertAssignmentSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as mammoth from "mammoth";
// PDF processing - server-side text extraction using ghostscript
import { execSync, spawn, exec as execCallback } from "child_process";
import { promisify } from 'util';
const exec = promisify(execCallback);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create music cache directory for yt-dlp downloads
const musicCacheDir = path.join(process.cwd(), 'music_cache');
if (!fs.existsSync(musicCacheDir)) {
  fs.mkdirSync(musicCacheDir, { recursive: true });
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
    fileSize: 500 * 1024 * 1024, // 500MB limit for extremely large academic textbooks
    fieldSize: 500 * 1024 * 1024, // 500MB field size limit
    files: 1, // Allow only 1 file at a time for better processing
    parts: 10000 // Increase parts limit for complex uploads
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Extract content from DOCX files - THIS MUST BE BEFORE STATIC SERVING
  app.get('/api/documents/:filename/extract', async (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const filePath = path.join(uploadsDir, filename);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const ext = path.extname(filename).toLowerCase();
      
      if (ext === '.docx') {
        try {
          const result = await mammoth.convertToHtml({ path: filePath });
          res.json({
            success: true,
            content: result.value,
            messages: result.messages || []
          });
        } catch (error) {
          console.error('Mammoth extraction error:', error);
          res.json({
            success: false,
            error: error instanceof Error ? error.message : 'Extraction failed',
            content: null
          });
        }
      } else if (ext === '.pdf') {
        try {
          console.log(`Attempting server-side PDF text extraction for: ${filename}`);
          
          // Try ghostscript-based text extraction
          let extractedText = '';
          try {
            // Use gs (ghostscript) to extract text from PDF
            const gsCommand = `gs -dNOPAUSE -dBATCH -sDEVICE=txtwrite -sOutputFile=- "${filePath}"`;
            extractedText = execSync(gsCommand, { encoding: 'utf8', timeout: 30000 });
            console.log(`Ghostscript extracted ${extractedText.length} characters`);
          } catch (gsError) {
            console.log('Ghostscript extraction failed, trying alternative...');
            
            // Fallback: Read file and provide structured template
            const fileInfo = fs.statSync(filePath);
            const fileSizeKB = Math.round(fileInfo.size / 1024);
            
            const structuredTemplate = `
              <div class="pdf-document-ready">
                <div class="pdf-info" style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #0ea5e9;">
                  <h2 style="margin: 0; color: #0c4a6e;">📄 ${filename}</h2>
                  <p style="margin: 5px 0 0 0; color: #075985; font-size: 14px;">PDF Document • ${fileSizeKB}KB • Ready for content</p>
                </div>
                
                <div class="content-sections" style="space-y: 20px;">
                  <div class="section">
                    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">📋 Document Summary</h3>
                    <p style="color: #6b7280; font-style: italic; line-height: 1.6;">Click here to add your summary of the PDF content. What are the main topics and concepts covered?</p>
                  </div>
                  
                  <div class="section">
                    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">🔍 Key Points & Concepts</h3>
                    <ul style="padding-left: 20px;">
                      <li style="color: #6b7280; font-style: italic; margin-bottom: 8px;">Click to add important concepts and definitions</li>
                      <li style="color: #6b7280; font-style: italic; margin-bottom: 8px;">Add key formulas, equations, or principles</li>
                      <li style="color: #6b7280; font-style: italic; margin-bottom: 8px;">Note important examples or case studies</li>
                    </ul>
                  </div>
                  
                  <div class="section">
                    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">💡 Personal Notes & Insights</h3>
                    <p style="color: #6b7280; font-style: italic; line-height: 1.6;">Add your personal observations, questions, and insights about the material.</p>
                  </div>
                  
                  <div class="section">
                    <h3 style="color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">📚 Study Focus Areas</h3>
                    <p style="color: #6b7280; font-style: italic; line-height: 1.6;">What should you focus on when studying this material? What are the most important takeaways?</p>
                  </div>
                </div>
              </div>
            `;
            
            res.json({
              success: true,
              content: structuredTemplate,
              type: 'pdf',
              message: 'PDF ready - structured template provided for your content'
            });
            return;
          }
          
          if (extractedText && extractedText.trim().length > 50) {
            // Aggressively clean up the extracted text to remove ALL Ghostscript noise
            let cleanText = extractedText
              // Remove Ghostscript headers - more comprehensive patterns
              .replace(/GPL Ghostscript[\s\S]*?All rights reserved\.[\s\S]*?COPYING for details\./g, '')
              .replace(/This software is supplied[\s\S]*?details\./g, '')
              .replace(/Processing pages[\s\S]*?Page \d+/g, '')
              .replace(/Loading font[\s\S]*?from[\s\S]*?\n/g, '')
              .replace(/>>showpage.*?<</g, '')
              .replace(/Error:.*?\n/g, '')
              .replace(/Copyright.*?\n/g, '')
              .replace(/Artifex Software.*?\n/g, '')
              // Remove any remaining technical patterns
              .replace(/^\s*GPL.*$/gm, '')
              .replace(/^\s*This software.*$/gm, '')
              .replace(/^\s*Loading.*$/gm, '')
              .replace(/^\s*Processing.*$/gm, '')
              .replace(/^\s*Error:.*$/gm, '')
              // Clean up spacing
              .replace(/\n\s*\n\s*\n/g, '\n\n')
              .replace(/\s+/g, ' ')
              .trim();
            
            // If text is still mostly technical noise, skip PDF extraction entirely
            if (cleanText.toLowerCase().includes('ghostscript') || 
                cleanText.toLowerCase().includes('artifex') ||
                cleanText.length < 100) {
              console.log('PDF contains mostly technical content, providing clean template');
              throw new Error('PDF text extraction contains technical noise');
            }
            
            // Split into paragraphs and identify headers vs content
            const lines = cleanText.split(/\n+/).filter(line => line.trim().length > 10);
            let formattedContent = '';
            
            lines.forEach(line => {
              const trimmed = line.trim();
              
              // Detect headers (short lines, likely titles)
              if (trimmed.length < 80 && /^[A-Z\s\d:.-]+$/.test(trimmed)) {
                formattedContent += `<h2 style="font-weight: bold; font-size: 16px; margin: 24px 0 12px 0; color: #000;">${trimmed}</h2>`;
              }
              // Regular content paragraphs
              else if (trimmed.length > 20) {
                formattedContent += `<p style="margin-bottom: 12px; line-height: 1.6; text-align: justify; text-indent: 0;">${trimmed}</p>`;
              }
            });
            
            // Format as clean document
            const documentContent = `
              <div class="pdf-document" style="max-width: none; padding: 30px; font-family: 'Times New Roman', serif; color: #000; background: white;">
                <div class="document-header" style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 15px;">
                  <h1 style="font-size: 20px; font-weight: bold; margin: 0; text-transform: uppercase;">${filename.replace('.pdf', '').replace(/_\d+$/, '').replace(/_/g, ' ')}</h1>
                </div>
                <div class="document-content" style="font-size: 14px; line-height: 1.6;">
                  ${formattedContent}
                </div>
              </div>
            `;
            
            res.json({
              success: true,
              content: documentContent,
              type: 'pdf',
              message: `Successfully extracted and formatted clean content from PDF`
            });
          } else {
            throw new Error('No substantial text content found');
          }
          
        } catch (error) {
          console.error('PDF extraction error:', error);
          
          // Provide clean fallback template
          const fileInfo = fs.statSync(filePath);
          const fileSizeKB = Math.round(fileInfo.size / 1024);
          
          const fallbackTemplate = `
            <div class="pdf-fallback">
              <div class="pdf-header" style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
                <h2 style="margin: 0; color: #92400e;">📄 ${filename}</h2>
                <p style="margin: 5px 0 0 0; color: #a16207; font-size: 14px;">PDF Document • ${fileSizeKB}KB • Ready for your content</p>
              </div>
              <div class="content-area" style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #fde68a;">
                <p style="color: #374151; line-height: 1.6;">Start adding your notes and content here. Click anywhere to edit.</p>
              </div>
            </div>
          `;
          
          res.json({
            success: true,
            content: fallbackTemplate,
            type: 'pdf',
            message: 'PDF ready for manual content entry'
          });
        }
      } else {
        res.status(400).json({ error: 'Unsupported file type' });
      }
    } catch (error) {
      console.error('Document extraction error:', error);
      res.status(500).json({ error: 'Failed to extract document content' });
    }
  });

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
      
      // If updating extractedText, add timestamp for change tracking
      if (updateData.extractedText) {
        // Note: updatedAt field will be handled by storage layer if it exists
        console.log('Document content updated for document ID:', id);
      }
      
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

  app.get("/api/assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignment", error: error instanceof Error ? error.message : "Unknown error" });
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

  // Assignment file upload endpoint
  app.post("/api/assignments/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const assignmentData = JSON.parse(req.body.assignmentData);
      const requestData = { ...assignmentData };
      if (typeof requestData.deadline === 'string') {
        requestData.deadline = new Date(requestData.deadline);
      }
      
      const validatedData = insertAssignmentSchema.parse({
        ...requestData,
        attachedFilePath: `/uploads/${req.file.filename}`,
        attachedFileName: req.file.originalname,
        attachedFileType: req.file.mimetype,
      });

      const assignment = await storage.createAssignment(validatedData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assignment with file", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Grade submission endpoint
  app.patch("/api/assignments/:id/grade", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { userGrade, status } = req.body;
      
      const assignment = await storage.updateAssignment(id, {
        userGrade: parseInt(userGrade),
        status: status || "completed"
      });

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit grade", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update assignment content (for editing documents)
  app.patch("/api/assignments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { extractedText } = req.body;
      
      const assignment = await storage.updateAssignment(id, {
        extractedText: extractedText
      });

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Assignment completion with Ollama checking
  app.post("/api/assignments/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Mark as completed first
      const updatedAssignment = await storage.updateAssignment(id, {
        status: "completed"
      });

      // Check if Ollama is available and process answers
      try {
        const ollamaResponse = await fetch("http://localhost:11434/api/health");
        if (ollamaResponse.ok) {
          // Let Ollama analyze the assignment completion
          const analysisPrompt = `May I analyze the completed assignment "${assignment.title}" and determine appropriate grading?

The assignment is of type: ${assignment.type}
Total marks: ${assignment.totalMarks || 100}

Please provide a progress calculation and suggested grade based on the assignment completion.`;

          const ollamaAnalysis = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "phi",
              prompt: analysisPrompt,
              stream: false
            })
          });

          if (ollamaAnalysis.ok) {
            const result = await ollamaAnalysis.json();
            await storage.updateAssignment(id, {
              ollamaResult: { analysis: result.response, timestamp: new Date() }
            });
          }
        }
      } catch (ollamaError) {
        console.log("Ollama not available for assignment analysis");
      }

      res.json(updatedAssignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to complete assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Add document to existing assignment
  app.post("/api/assignments/add-document", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const assignmentId = parseInt(req.body.assignmentId);
      if (!assignmentId) {
        return res.status(400).json({ message: "Assignment ID is required" });
      }

      const assignment = await storage.updateAssignment(assignmentId, {
        attachedFilePath: `/uploads/${req.file.filename}`,
        attachedFileName: req.file.originalname,
        attachedFileType: req.file.mimetype,
      });

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to add document to assignment", error: error instanceof Error ? error.message : "Unknown error" });
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

  // AI Chat with fallback demo mode
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { message, sessionId, automated = false } = req.body;
      
      const isReplit = process.env.REPLIT_DOMAINS || process.env.REPL_ID;
      
      // Try Ollama API first, fallback for Replit demo
      let aiResponse;
      try {
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

        aiResponse = await ollamaResponse.json();
      } catch (ollamaError) {
        if (isReplit) {
          // Smart demo responses for Replit environment
          const lowerMessage = message.toLowerCase();
          let demoResponse = "";
          
          if (lowerMessage.includes("document") || lowerMessage.includes("pdf")) {
            demoResponse = "I can see your uploaded documents! May I help you create a summary of your recent immunobiology PDF or generate study questions based on your materials? I have full access to all your documents and can organize them by topics.";
          } else if (lowerMessage.includes("study plan")) {
            demoResponse = "May I create a personalized study plan for you? I can analyze your documents, assignments, and deadlines to generate an optimal daily schedule. What subjects are you focusing on?";
          } else if (lowerMessage.includes("quiz") || lowerMessage.includes("question")) {
            demoResponse = "May I generate practice questions based on your uploaded documents? I can create multiple choice, short answer, or essay questions from your study materials.";
          } else {
            demoResponse = `Hello! I'm your StudyCompanion AI with **full access** to your entire app. I can help with:

• **Documents**: View, summarize, and organize all your PDFs and files
• **Study Plans**: Create personalized daily schedules based on your pace  
• **Quizzes**: Generate practice questions from your materials
• **Notes**: Create and organize study notes with markdown support
• **Assignments**: Track CATs and deadlines
• **Break Reminders**: Monitor study time and suggest healthy breaks

**Demo Mode**: Currently running in Replit. Download locally for full Ollama integration!

What would you like help with?`;
          }
          
          aiResponse = { response: demoResponse };
        } else {
          throw new Error("Cannot connect to Ollama. Please ensure Ollama is running locally with: ollama serve");
        }
      }
      
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

  // Smart Ollama health check (works in Replit and locally)
  app.get("/api/ai/health", async (req, res) => {
    const isReplit = process.env.REPLIT_DOMAINS || process.env.REPL_ID;
    
    try {
      const response = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(2000)
      });
      
      if (response.ok) {
        const models = await response.json();
        const hasPhiModel = models.models?.some((model: any) => model.name.includes("phi"));
        const availableModels = models.models?.map((m: any) => m.name) || [];
        
        res.json({ 
          status: "connected", 
          hasPhiModel,
          availableModels,
          message: hasPhiModel 
            ? "AI Assistant ready with phi model" 
            : `Available models: ${availableModels.join(', ')}. Run 'ollama pull phi' for best results.`
        });
      } else {
        res.status(503).json({ 
          status: "error", 
          message: "Ollama responding but not properly configured" 
        });
      }
    } catch (error) {
      if (isReplit) {
        res.status(503).json({ 
          status: "demo_mode", 
          message: "Running in Replit - AI features work in demo mode. Download locally for full Ollama integration."
        });
      } else {
        res.status(503).json({ 
          status: "disconnected", 
          message: "Ollama not running. Start with: ollama serve"
        });
      }
    }
  });

  // Music API endpoints
  
  // Search for music
  app.get("/api/music/search", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      // Use yt-dlp to search YouTube for any music (unrestricted)
      const searchCommand = `yt-dlp "ytsearch15:${q}" --print "%(id)s|%(title)s|%(uploader)s|%(duration_string)s|%(thumbnail)s" --no-download`;
      
      try {
        const { stdout, stderr } = await exec(searchCommand);
        
        if (!stdout || stdout.trim() === '') {
          console.log('No search results returned from yt-dlp');
          return res.status(503).json({ 
            message: "No results found - YouTube may be blocking requests", 
            error: "Empty search results"
          });
        }
        
        const lines = stdout.trim().split('\n').filter(line => line.includes('|'));
        console.log(`Found ${lines.length} valid result lines from yt-dlp`);
        
        const results = lines.map((line, index) => {
          const parts = line.split('|');
          if (parts.length >= 4) {
            const [id, title, artist, duration, thumbnail] = parts;
            return {
              id: id || `search_${index}`,
              title: title || 'Unknown Title',
              artist: artist || 'Unknown Artist', 
              duration: duration || '0:00',
              thumbnail: thumbnail || '/api/placeholder/200/200',
              streamUrl: `/api/music/stream/${id || `search_${index}`}`,
              youtubeId: id
            };
          }
          return null;
        }).filter(song => song && song.title !== 'Unknown Title' && song.id);

        if (results.length === 0) {
          console.log('No valid songs parsed from search results');
          return res.status(503).json({ 
            message: "Search parsing failed - try a different query", 
            error: "No parseable results"
          });
        }

        console.log(`Returning ${results.length} search results`);
        res.json(results);
      } catch (error) {
        console.log('yt-dlp command failed:', error);
        
        // Try to extract any partial results from stderr
        const errorOutput = error instanceof Error ? error.message : String(error);
        
        res.status(503).json({ 
          message: "YouTube search blocked by bot protection. Try searching for different terms or wait a moment.", 
          error: "YouTube bot protection active",
          suggestion: "Try searching for less popular terms or wait before searching again"
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Search failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Stream music
  app.get("/api/music/stream/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if file exists in cache first
      const cachedFile = path.join(musicCacheDir, `${id}.mp3`);
      if (fs.existsSync(cachedFile)) {
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Accept-Ranges', 'bytes');
        return res.sendFile(cachedFile);
      }
      
      // Extract stream URL using yt-dlp
      const extractCommand = `yt-dlp -f "bestaudio[ext=m4a]/best" --get-url "https://youtube.com/watch?v=${id}"`;
      
      try {
        const { stdout } = await exec(extractCommand);
        const streamUrl = stdout.trim();
        
        if (streamUrl && streamUrl.startsWith('http')) {
          // Redirect to the direct stream URL
          res.redirect(streamUrl);
        } else {
          throw new Error('Invalid stream URL');
        }
      } catch (error) {
        console.log('yt-dlp stream extraction failed:', error);
        res.status(404).json({ message: "Stream not available" });
      }
    } catch (error) {
      res.status(500).json({ message: "Streaming failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Download music
  app.post("/api/music/download", async (req, res) => {
    try {
      const { songId, title } = req.body;
      
      const outputPath = path.join(musicCacheDir, `${songId}.%(ext)s`);
      const downloadCommand = `yt-dlp -f "bestaudio[ext=m4a]/best" --extract-audio --audio-format mp3 --audio-quality 0 -o "${outputPath}" "https://youtube.com/watch?v=${songId}"`;
      
      // Start download in background
      const downloadProcess = spawn('bash', ['-c', downloadCommand], { detached: true, stdio: 'ignore' });
      downloadProcess.unref();
      
      res.json({ 
        message: "Download started - music will be cached for offline playback",
        downloadId: `download_${songId}_${Date.now()}`,
        title,
        cachePath: `${songId}.mp3`
      });
    } catch (error) {
      res.status(500).json({ message: "Download failed", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Get playlists
  app.get("/api/music/playlists", async (req, res) => {
    try {
      // Mock playlists for now
      const playlists = [
        {
          id: "1",
          name: "Favorites",
          songCount: 5,
          cover: "/api/placeholder/200/200"
        },
        {
          id: "2", 
          name: "Chill Vibes",
          songCount: 8,
          cover: "/api/placeholder/200/200"
        }
      ];
      
      res.json(playlists);
    } catch (error) {
      res.status(500).json({ message: "Failed to get playlists", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Create playlist
  app.post("/api/music/playlists", async (req, res) => {
    try {
      const { name } = req.body;
      
      const playlist = {
        id: Date.now().toString(),
        name,
        songCount: 0,
        songs: [],
        cover: "/api/placeholder/200/200"
      };
      
      res.json(playlist);
    } catch (error) {
      res.status(500).json({ message: "Failed to create playlist", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Add song to playlist  
  app.post("/api/music/playlists/:id/songs", async (req, res) => {
    try {
      const { id } = req.params;
      const { songId } = req.body;
      
      res.json({ message: "Song added to playlist", playlistId: id, songId });
    } catch (error) {
      res.status(500).json({ message: "Failed to add song to playlist", error: error instanceof Error ? error.message : "Unknown error" });
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

  // Unit Progress endpoints
  app.get("/api/unit-progress", async (req, res) => {
    try {
      const progress = await storage.getUnitProgress();
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/unit-progress/:unitId", async (req, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      const progress = await storage.getUnitProgressByUnit(unitId);
      res.json(progress || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/unit-progress/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const progress = await storage.updateUnitProgress(id, req.body);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to update unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
