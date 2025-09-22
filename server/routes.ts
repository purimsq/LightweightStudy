import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage-sqlite";
import { z } from "zod";
import { insertUnitSchema, insertDocumentSchema, insertNoteSchema, insertAssignmentSchema, type Assignment } from "../shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as mammoth from "mammoth";
// Document processing
import { execSync, spawn, exec as execCallback } from "child_process";
import { promisify } from 'util';
const exec = promisify(execCallback);

// YouTube Data API v3 integration
import axios from 'axios';
import cors from 'cors';

// Authentication routes
import authRoutes from './routes/auth';
import { authService } from './services/auth-service';
import { authenticateToken, optionalAuth, type AuthenticatedRequest } from './middleware/auth';

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
    // Allow only DOCX files
    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Word documents (.docx and .doc) are allowed'));
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for extremely large academic textbooks
    fieldSize: 500 * 1024 * 1024, // 500MB field size limit
    files: 1, // Allow only 1 file at a time for better processing
    parts: 10000 // Increase parts limit for complex uploads
  }
});

// Configure multer for music uploads
const musicUpload = multer({ 
  storage: storage_multer,
  fileFilter: (req, file, cb) => {
    // Allow audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for audio files
    fieldSize: 100 * 1024 * 1024, // 100MB field size limit
    files: 1, // Allow only 1 file at a time
    parts: 1000 // Reasonable parts limit for audio uploads
  }
});

export async function registerRoutes(app: Express, io?: any): Promise<Server> {
  
  // Register authentication routes
  app.use('/api/auth', authRoutes);
  
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


  // Users - Updated to use authentication
  app.get("/api/users/current", async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (!token) {
        return res.status(401).json({ message: 'Access token required' });
      }

      const user = await authService.verifyToken(token);
      if (!user) {
        return res.status(401).json({ message: 'Invalid or expired token' });
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

  // Friends
  app.get("/api/friends", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const friends = await storage.getFriends(req.user!.id);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ message: "Failed to get friends", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/friends/pending", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const pendingRequests = await storage.getPendingFriendRequests(req.user!.id);
      res.json(pendingRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get pending friend requests", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/friends/sent", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const sentRequests = await storage.getSentFriendRequests(req.user!.id);
      res.json(sentRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get sent friend requests", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/friends/all", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const allRequests = await storage.getAllFriendRequests(req.user!.id);
      res.json(allRequests);
    } catch (error) {
      res.status(500).json({ message: "Failed to get all friend requests", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

            app.post("/api/friends/request", authenticateToken, async (req: AuthenticatedRequest, res) => {
              try {
                const { friendId } = req.body;
                if (!friendId) {
                  return res.status(400).json({ message: "Friend ID is required" });
                }
                
                const friendRequest = await storage.sendFriendRequest(req.user!.id, friendId);
                
                // Emit real-time notification to the friend
                if (io) {
                  io.emit('friend_request_received', {
                    fromUserId: req.user!.id,
                    fromUsername: req.user!.username,
                    fromName: req.user!.name,
                    friendId: friendId
                  });
                  console.log(`📨 Friend request notification sent to user ${friendId}`);
                }
                
                res.status(201).json(friendRequest);
              } catch (error) {
                res.status(500).json({ message: "Failed to send friend request", error: error instanceof Error ? error.message : "Unknown error" });
              }
            });

  app.post("/api/friends/accept", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { friendId } = req.body;
      if (!friendId) {
        return res.status(400).json({ message: "Friend ID is required" });
      }
      
      const friend = await storage.acceptFriendRequest(req.user!.id, friendId);
      
      // Emit real-time notification to both users
      if (io) {
        // Notify the person who accepted
        io.emit('friend_request_accepted', {
          fromUserId: req.user!.id,
          fromUsername: req.user!.username,
          fromName: req.user!.name,
          friendId: friendId
        });
        
        // Notify the person who was accepted
        io.emit('friend_request_accepted', {
          fromUserId: friendId,
          fromUsername: req.user!.username,
          fromName: req.user!.name,
          friendId: req.user!.id
        });
        
        console.log(`📨 Friend request acceptance notification sent to both users`);
      }
      
      res.json(friend);
    } catch (error) {
      res.status(500).json({ message: "Failed to accept friend request", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/friends/reject", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { friendId } = req.body;
      if (!friendId) {
        return res.status(400).json({ message: "Friend ID is required" });
      }
      
      await storage.rejectFriendRequest(req.user!.id, friendId);
      res.json({ message: "Friend request rejected" });
    } catch (error) {
      res.status(500).json({ message: "Failed to reject friend request", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/friends/request/:friendId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const friendId = parseInt(req.params.friendId);
      await storage.deleteFriendRequest(req.user!.id, friendId);
      res.json({ message: "Friend request deleted" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete friend request", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/users/search", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const users = await storage.searchUsers(q, req.user!.id);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to search users", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Messages
  app.get("/api/messages/conversations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const conversations = await storage.getConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get conversations", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/messages/:friendId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const friendId = parseInt(req.params.friendId);
      const messages = await storage.getMessages(req.user!.id, friendId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get messages", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { receiverId, content, messageType = 'text' } = req.body;
      if (!receiverId || !content) {
        return res.status(400).json({ message: "Receiver ID and content are required" });
      }
      
      const message = await storage.sendMessage({
        senderId: req.user!.id,
        receiverId,
        content,
        messageType
      });
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send message", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/messages/:senderId/read", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const senderId = parseInt(req.params.senderId);
      await storage.markMessagesAsRead(req.user!.id, senderId);
      res.json({ message: "Messages marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark messages as read", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Groups
  app.get("/api/groups", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groups = await storage.getUserGroups(req.user!.id);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to get groups", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/groups", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { name, description, avatar, memberIds } = req.body;
      if (!name) {
        return res.status(400).json({ message: "Group name is required" });
      }

      // Create the group
      const group = await storage.createGroup({ name, description, avatar }, req.user!.id);
      
      // Add the creator as admin
      await storage.addGroupMember(group.id, req.user!.id, 'admin');
      
      // Add other members
      if (memberIds && Array.isArray(memberIds)) {
        for (const memberId of memberIds) {
          await storage.addGroupMember(group.id, memberId, 'member');
        }
      }

      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to create group", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/groups/:id/members", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const isMember = await storage.isUserInGroup(req.user!.id, groupId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group members", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/groups/:id/members", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userId, role = 'member' } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const isMember = await storage.isUserInGroup(req.user!.id, groupId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const member = await storage.addGroupMember(groupId, userId, role);
      res.status(201).json(member);
    } catch (error) {
      res.status(500).json({ message: "Failed to add group member", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/groups/:id/members/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const isMember = await storage.isUserInGroup(req.user!.id, groupId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      await storage.removeGroupMember(groupId, userId);
      res.json({ message: "Member removed from group" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove group member", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/groups/:id/messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const isMember = await storage.isUserInGroup(req.user!.id, groupId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const messages = await storage.getGroupMessages(groupId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Failed to get group messages", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/groups/:id/messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { content, messageType = 'text' } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const isMember = await storage.isUserInGroup(req.user!.id, groupId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const message = await storage.sendMessage({
        senderId: req.user!.id,
        groupId,
        content,
        messageType
      });
      res.status(201).json(message);
    } catch (error) {
      res.status(500).json({ message: "Failed to send group message", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/groups/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const updateData = req.body;
      
      const isMember = await storage.isUserInGroup(req.user!.id, groupId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      const group = await storage.updateGroup(groupId, updateData);
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to update group", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/groups/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const groupId = parseInt(req.params.id);
      
      const isMember = await storage.isUserInGroup(req.user!.id, groupId);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }

      await storage.deleteGroup(groupId);
      res.json({ message: "Group deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete group", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Units
  app.get("/api/units", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const units = await storage.getUnits(req.user!.id);
      res.json(units);
    } catch (error) {
      res.status(500).json({ message: "Failed to get units", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/units/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const unit = await storage.getUnit(id, req.user!.id);
      if (!unit) {
        return res.status(404).json({ message: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/units", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertUnitSchema.parse(req.body);
      const unitData = { ...validatedData, userId: req.user!.id };
      const unit = await storage.createUnit(unitData);
      
      console.log(`✅ Created unit: ${unit.name} (ID: ${unit.id})`);
      
      // Automatically create unit progress for the new unit
      try {
        const unitProgress = await storage.createUnitProgress({
          userId: req.user!.id,
          unitId: unit.id,
          progressPercentage: 0,
          weeklyImprovement: 0,
          trend: "stable"
        });
        console.log(`✅ Created unit progress for unit ${unit.id}: ${unitProgress.id}`);
      } catch (progressError) {
        console.error(`❌ Failed to create unit progress for unit ${unit.id}:`, progressError);
        // Don't fail the unit creation if progress creation fails
      }
      
      res.status(201).json(unit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/units/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const unit = await storage.updateUnit(id, updateData, req.user!.id);
      res.json(unit);
    } catch (error) {
      res.status(500).json({ message: "Failed to update unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/units/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUnit(id, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Unit not found" });
      }
      
      // Clean up unit progress when unit is deleted
      await storage.deleteUnitProgress(id, req.user!.id);
      
      res.json({ message: "Unit deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete unit", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Documents
  app.get("/api/documents", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const unitId = req.query.unitId ? parseInt(req.query.unitId as string) : undefined;
      
      let documents;
      if (unitId) {
        documents = await storage.getDocumentsByUnit(unitId, req.user!.id);
      } else {
        documents = await storage.getDocuments(req.user!.id);
      }
      
      res.json(documents);
    } catch (error) {
      console.error(`❌ Error getting documents:`, error);
      res.status(500).json({ message: "Failed to get documents" });
    }
  });

  app.get("/api/documents/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const document = await storage.getDocument(id, req.user!.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(document);
    } catch (error) {
      console.error(`❌ Error getting document ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to get document" });
    }
  });

  // File upload endpoint
  app.post("/api/documents/upload", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { unitId } = req.body;
      if (!unitId) {
        return res.status(400).json({ message: "Unit ID is required" });
      }

      const documentData = {
        userId: req.user!.id,
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
        isCompleted: false,
      };

      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // JSON document creation endpoint
  app.post("/api/documents", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertDocumentSchema.parse(req.body);
      const documentData = { ...validatedData, userId: req.user!.id };
      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/documents/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      // If updating extractedText, add timestamp for change tracking
      if (updateData.extractedText) {
        // Note: updatedAt field will be handled by storage layer if it exists
        console.log('Document content updated for document ID:', id);
      }
      
      const document = await storage.updateDocument(id, updateData, req.user!.id);
      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to update document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/documents/:id/toggle-completion", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log(`🔄 PATCH /api/documents/:id/toggle-completion called`);
      console.log(`📝 Request params:`, req.params);
      console.log(`📝 Request headers:`, req.headers);
      
      const id = parseInt(req.params.id);
      console.log(`🔄 Toggle completion request for document ${id}`);
      
      if (isNaN(id)) {
        console.error(`❌ Invalid document ID: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid document ID" });
      }
      
      const document = await storage.getDocument(id, req.user!.id);
      if (!document) {
        console.error(`❌ Document not found: ${id}`);
        return res.status(404).json({ message: "Document not found" });
      }
      
      console.log(`📄 Found document:`, { id: document.id, filename: document.filename, isCompleted: document.isCompleted });
      
      // Simple toggle logic
      const newCompletion = !(document.isCompleted ?? false);
      
      const updatedDocument = await storage.updateDocument(id, {
        isCompleted: newCompletion
      }, req.user!.id);
      
      console.log(`✅ Document ${id} completion toggled: ${document.isCompleted ?? false} → ${newCompletion}`);
      console.log(`📤 Sending response:`, updatedDocument);
      
      // Update unit progress if document has a unit
      if (document.unitId) {
        const newProgress = await calculateUnitProgress(document.unitId, req.user!.id);
        const unitProgress = await storage.getUnitProgressByUnit(document.unitId, req.user!.id);
        
        if (unitProgress) {
          await storage.updateUnitProgress(unitProgress.id, {
            progressPercentage: newProgress
          }, req.user!.id);
          console.log(`✅ Updated unit ${document.unitId} progress to ${newProgress}%`);
        }
      }
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("❌ Error toggling document completion:", error);
      res.status(500).json({ message: "Failed to toggle document completion" });
    }
  });

  app.delete("/api/documents/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDocument(id, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Notes
  app.get("/api/notes", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const documentId = parseInt(req.query.documentId as string);
      const notes = await storage.getNotesByDocument(documentId, req.user!.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notes", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Document-specific notes routes
  app.get("/api/documents/:id/notes", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const notes = await storage.getNotesByDocument(documentId, req.user!.id);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notes", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/documents/:id/notes", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const noteData = { ...req.body, documentId, userId: req.user!.id };
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

  app.post("/api/notes", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertNoteSchema.parse({ ...req.body, userId: req.user!.id });
      const note = await storage.createNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create note", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/notes/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const note = await storage.updateNote(id, updateData, req.user!.id);
      res.json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/notes/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteNote(id, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Note not found" });
      }
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete note", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Assignments
  app.get("/api/assignments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const assignments = await storage.getAssignments(req.user!.id);
      res.json(assignments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignments", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/assignments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id, req.user!.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/assignments", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      // Convert deadline string to Date object if it's a string
      const requestData = { ...req.body };
      if (typeof requestData.deadline === 'string') {
        requestData.deadline = new Date(requestData.deadline);
      }
      
      const validatedData = insertAssignmentSchema.parse(requestData);
      const assignmentData = { ...validatedData, userId: req.user!.id };
      const assignment = await storage.createAssignment(assignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/assignments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      const assignment = await storage.updateAssignment(id, updateData, req.user!.id);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Assignment file upload endpoint
  app.post("/api/assignments/upload", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const parsedAssignmentData = JSON.parse(req.body.assignmentData);
      const requestData = { ...parsedAssignmentData, userId: req.user!.id };
      if (typeof requestData.deadline === 'string') {
        requestData.deadline = new Date(requestData.deadline);
      }
      
      const validatedData = insertAssignmentSchema.parse({
        ...requestData,
        attachedFilePath: `/uploads/${req.file.filename}`,
        attachedFileName: req.file.originalname,
        attachedFileType: req.file.mimetype,
      });

      const finalAssignmentData = { ...validatedData, userId: req.user!.id };

      const assignment = await storage.createAssignment(finalAssignmentData);
      res.status(201).json(assignment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assignment with file", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Grade submission endpoint
  app.patch("/api/assignments/:id/grade", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { userGrade, status } = req.body;
      
      const assignment = await storage.updateAssignment(id, {
        userGrade: parseInt(userGrade),
        status: status || "completed"
      }, req.user!.id);

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to submit grade", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Update assignment content (for editing documents)
  app.patch("/api/assignments/:id/content", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { extractedText } = req.body;
      
      const assignment = await storage.updateAssignment(id, {
        extractedText: extractedText
      }, req.user!.id);

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Assignment completion with Ollama checking
  app.post("/api/assignments/:id/complete", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const assignment = await storage.getAssignment(id, req.user!.id);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Mark as completed first
      const updatedAssignment = await storage.updateAssignment(id, {
        status: "completed"
      }, req.user!.id);

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
            }, req.user!.id);
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

  // Helper function to calculate unit progress
  async function calculateUnitProgress(unitId: number, userId: number): Promise<number> {
    try {
      // Get all documents and assignments for this unit
      const documents = await storage.getDocumentsByUnit(unitId, userId);
      const assignments = await storage.getAssignmentsByUnit(unitId, userId);
      
      // Count total items and completed items
      const totalDocuments = documents.length;
      const completedDocuments = documents.filter(doc => doc.isCompleted ?? false).length;
      
      const totalAssignments = assignments.length;
      const completedAssignments = assignments.filter(assign => assign.status === "completed").length;
      
      // Total items in the unit
      const totalItems = totalDocuments + totalAssignments;
      const completedItems = completedDocuments + completedAssignments;
      
      // Calculate progress: completed items / total items * 100
      const overallProgress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
      
      console.log(`📊 Unit ${unitId} progress calculation:`, {
        documents: { total: totalDocuments, completed: completedDocuments },
        assignments: { total: totalAssignments, completed: completedAssignments },
        totalItems,
        completedItems,
        overallProgress: Math.round(overallProgress)
      });
      
      return Math.round(overallProgress);
    } catch (error) {
      console.error("Error calculating unit progress:", error);
      return 0;
    }
  }

  // Assignment completion toggle with marks
  app.patch("/api/assignments/:id/toggle-completion", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const { userGrade, totalMarks } = req.body;
      
      const assignment = await storage.getAssignment(id, req.user!.id);
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      // Toggle completion status
      const newStatus = assignment.status === "completed" ? "pending" : "completed";
      
      // Update assignment with new status and marks if provided
      const updateData: any = { status: newStatus };
      
      if (newStatus === "completed" && userGrade !== undefined && totalMarks !== undefined) {
        updateData.userGrade = parseInt(userGrade);
        updateData.totalMarks = parseInt(totalMarks);
        
        // Calculate progress contribution (percentage of total marks)
        const progressContribution = Math.round((parseInt(userGrade) / parseInt(totalMarks)) * 100);
        updateData.progressContribution = progressContribution;
      } else if (newStatus === "pending") {
        // Reset marks when marking as incomplete
        updateData.userGrade = null;
        updateData.totalMarks = null;
        updateData.progressContribution = null;
      }

      const updatedAssignment = await storage.updateAssignment(id, updateData, req.user!.id);

      // Update unit progress if assignment has a unit
      if (assignment.unitId) {
        const newProgress = await calculateUnitProgress(assignment.unitId, req.user!.id);
        const unitProgress = await storage.getUnitProgressByUnit(assignment.unitId, req.user!.id);
        
        if (unitProgress) {
          await storage.updateUnitProgress(unitProgress.id, {
            progressPercentage: newProgress
          }, req.user!.id);
          console.log(`✅ Updated unit ${assignment.unitId} progress to ${newProgress}%`);
        }
      }

      res.json(updatedAssignment);
    } catch (error) {
      console.error("Error toggling assignment completion:", error);
      res.status(500).json({ message: "Failed to toggle assignment completion" });
    }
  });

  // Add document to existing assignment
  app.post("/api/assignments/add-document", authenticateToken, upload.single('file'), async (req: AuthenticatedRequest, res) => {
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
      }, req.user!.id);

      res.json(assignment);
    } catch (error) {
      res.status(500).json({ message: "Failed to add document to assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/assignments/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAssignment(id, req.user!.id);
      if (!deleted) {
        return res.status(404).json({ message: "Assignment not found" });
      }
      res.json({ message: "Assignment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete assignment", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Study Plans
  app.get("/api/study-plans", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const dateParam = req.query.date as string;
      if (dateParam) {
        const date = new Date(dateParam);
        const plan = await storage.getStudyPlanByDate(date, req.user!.id);
        return res.json(plan || null);
      }
      
      const plans = await storage.getStudyPlans(req.user!.id);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Failed to get study plans", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/study-plans", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const planData = { ...req.body, userId: req.user!.id };
      const plan = await storage.createStudyPlan(planData);
      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ message: "Failed to create study plan", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Document Summary routes
  app.get("/api/documents/:id/summary", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId, req.user!.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Check if document already has a summary
      if (document.summary) {
        res.json({
          content: document.summary,
          createdAt: document.uploadedAt,
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
  app.post("/api/ai/chat", authenticateToken, async (req: AuthenticatedRequest, res) => {
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
      let chat = await storage.getAiChatBySession(sessionId, req.user!.id);
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
        chat = await storage.updateAiChat(chat.id, { messages }, req.user!.id);
      } else {
        chat = await storage.createAiChat({
          userId: req.user!.id,
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

  // YouTube Data API v3 Routes
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY_HERE'; // Replace with your real YouTube API key
  
  // Check if API key is properly configured
  if (YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
    console.warn('⚠️  WARNING: Please set a real YouTube API key in your environment variables or replace the placeholder in server/routes.ts');
    console.warn('📖 Instructions: https://developers.google.com/youtube/v3/getting-started');
  }
  
  // Fallback mock data for when API key is invalid
  const mockVideos = [
    {
      id: { videoId: 'dQw4w9WgXcQ' },
      snippet: {
        title: 'Rick Astley - Never Gonna Give You Up',
        channelTitle: 'Rick Astley',
        thumbnails: { medium: { url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg' } }
      }
    },
    {
      id: { videoId: '9bZkp7q19f0' },
      snippet: {
        title: 'PSY - GANGNAM STYLE',
        channelTitle: 'officialpsy',
        thumbnails: { medium: { url: 'https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg' } }
      }
    },
    {
      id: { videoId: 'kJQP7kiw5Fk' },
      snippet: {
        title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
        channelTitle: 'Luis Fonsi',
        thumbnails: { medium: { url: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg' } }
      }
    },
    {
      id: { videoId: 'y6120QOlsfU' },
      snippet: {
        title: 'Sandstorm - Darude',
        channelTitle: 'Darude',
        thumbnails: { medium: { url: 'https://i.ytimg.com/vi/y6120QOlsfU/mqdefault.jpg' } }
      }
    },
    {
      id: { videoId: 'ZZ5LpwO-An4' },
      snippet: {
        title: 'Haddaway - What Is Love',
        channelTitle: 'Haddaway',
        thumbnails: { medium: { url: 'https://i.ytimg.com/vi/ZZ5LpwO-An4/mqdefault.jpg' } }
      }
    }
  ];
  
  // Search YouTube videos (Mock implementation for demo)
  app.get("/api/youtube/search", async (req, res) => {
    try {
      const { q, maxResults = 15 } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      console.log('YouTube API request params:', {
        part: 'snippet',
        q: q,
        type: 'video',
        maxResults: maxResults,
        key: YOUTUBE_API_KEY.substring(0, 10) + '...', // Log partial key for security
        videoCategoryId: '10' // Music category
      });

      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: q,
          type: 'video',
          maxResults: maxResults,
          key: YOUTUBE_API_KEY,
          videoCategoryId: '10' // Music category
        }
      });

      console.log('YouTube API response received:', response.data.items?.length || 0, 'items');

      res.json({ items: response.data.items });
    } catch (error) {
      console.error('YouTube search error:', error);
      
      // Check for specific API key issues
      if (error instanceof Error) {
        if (error.message.includes('400') || error.message.includes('403')) {
          console.error('❌ YouTube API Error: Invalid API key or quota exceeded');
          console.error('🔑 Please check your YouTube API key configuration');
          res.status(400).json({ 
            message: "YouTube API Error: Please check your API key configuration",
            error: "Invalid API key or quota exceeded"
          });
        } else {
          res.status(500).json({ 
            message: "YouTube search failed", 
            error: error.message
          });
        }
      } else {
        res.status(500).json({ 
          message: "YouTube search failed", 
          error: "Unknown error"
        });
      }
    }
  });

  // Get video details (including duration)
  app.get("/api/youtube/video/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log('YouTube API video details for ID:', id);

      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails',
          id: id,
          key: YOUTUBE_API_KEY
        }
      });

      if (response.data.items.length === 0) {
        return res.status(404).json({ message: "Video not found" });
      }

      const video = response.data.items[0];
      const duration = video.contentDetails.duration; // ISO 8601 duration format
      
      // Convert ISO 8601 duration to readable format
      const durationMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      let readableDuration = '0:00';
      if (durationMatch) {
        const hours = parseInt(durationMatch[1] || '0');
        const minutes = parseInt(durationMatch[2] || '0');
        const seconds = parseInt(durationMatch[3] || '0');
        if (hours > 0) {
          readableDuration = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
          readableDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
      }

      res.json({
        id: video.id,
        title: video.snippet.title,
        artist: video.snippet.channelTitle,
        thumbnail: video.snippet.thumbnails.medium.url,
        duration: readableDuration,
        description: video.snippet.description
      });
    } catch (error) {
      console.error('YouTube video details error:', error);
      
      // Check for specific API key issues
      if (error instanceof Error) {
        if (error.message.includes('400') || error.message.includes('403')) {
          console.error('❌ YouTube API Error: Invalid API key or quota exceeded');
          console.error('🔑 Please check your YouTube API key configuration');
          res.status(400).json({ 
            message: "YouTube API Error: Please check your API key configuration",
            error: "Invalid API key or quota exceeded"
          });
        } else {
          res.status(500).json({ 
            message: "Failed to get video details", 
            error: error.message
          });
        }
      } else {
        res.status(500).json({ 
          message: "Failed to get video details", 
          error: "Unknown error"
        });
      }
    }
  });

  // Get YouTube search suggestions
  app.get("/api/youtube/suggestions", async (req, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      // Use YouTube's search suggestions endpoint
      const response = await axios.get('https://suggestqueries.google.com/complete/search', {
        params: {
          client: 'youtube',
          ds: 'yt',
          q: q
        }
      });

      // Extract suggestions from the response - Google returns [query, [suggestions], ...]
      let suggestions: string[] = [];
      if (Array.isArray(response.data) && response.data.length > 1 && Array.isArray(response.data[1])) {
        suggestions = response.data[1];
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        // Fallback: if the response structure is different, try to extract suggestions
        suggestions = response.data.filter((item: any) => typeof item === 'string' && item !== q);
      }
      
      // Ensure we return an array
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
      
      res.json({ suggestions });
    } catch (error) {
      console.error('YouTube suggestions error:', error);
      
      // Return empty array as fallback
      res.json({ suggestions: [] });
    }
  });

  // Get YouTube embed URL for player
  app.get("/api/youtube/embed/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1&origin=${encodeURIComponent(req.get('origin') || 'http://localhost:5000')}`;
      res.json({ embedUrl });
    } catch (error) {
      res.status(500).json({ 
        message: "Failed to generate embed URL", 
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

  // Unit Progress endpoints
  app.get("/api/unit-progress", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const progress = await storage.getUnitProgress(req.user!.id);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/unit-progress/:unitId", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const unitId = parseInt(req.params.unitId);
      const progress = await storage.getUnitProgressByUnit(unitId, req.user!.id);
      res.json(progress || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to get unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.patch("/api/unit-progress/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const progress = await storage.updateUnitProgress(id, req.body, req.user!.id);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to update unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Create unit progress for a unit (useful for fixing missing progress)
  app.post("/api/unit-progress", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { unitId } = req.body;
      if (!unitId) {
        return res.status(400).json({ message: "Unit ID is required" });
      }

      // Check if progress already exists
      const existingProgress = await storage.getUnitProgressByUnit(unitId, req.user!.id);
      if (existingProgress) {
        return res.status(400).json({ message: "Unit progress already exists for this unit" });
      }

      const progress = await storage.createUnitProgress({
        userId: req.user!.id,
        unitId: parseInt(unitId),
        progressPercentage: 0,
        weeklyImprovement: 0,
        trend: "stable"
      });

      console.log(`✅ Created missing unit progress for unit ${unitId}: ${progress.id}`);
      res.status(201).json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to create unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Fix all missing unit progress entries
  app.post("/api/unit-progress/fix-missing", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const units = await storage.getUnits(req.user!.id);
      const unitProgress = await storage.getUnitProgress(req.user!.id);
      
      const missingProgress = units.filter(unit => 
        !unitProgress.find(progress => progress.unitId === unit.id)
      );
      
      const createdProgress = [];
      
      for (const unit of missingProgress) {
        try {
          const progress = await storage.createUnitProgress({
            userId: req.user!.id,
            unitId: unit.id,
            progressPercentage: 0,
            weeklyImprovement: 0,
            trend: "stable"
          });
          createdProgress.push(progress);
          console.log(`✅ Created missing unit progress for unit ${unit.id} (${unit.name}): ${progress.id}`);
        } catch (error) {
          console.error(`❌ Failed to create progress for unit ${unit.id}:`, error);
        }
      }
      
      res.json({ 
        message: `Fixed ${createdProgress.length} missing unit progress entries`,
        created: createdProgress,
        totalUnits: units.length,
        totalProgress: unitProgress.length + createdProgress.length
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fix missing unit progress", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Music endpoints
  app.get("/api/music", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const music = await storage.getMusic(req.user!.id);
      res.json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to get music", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/music/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const music = await storage.getMusicById(id, req.user!.id);
      if (!music) {
        return res.status(404).json({ message: "Music not found" });
      }
      res.json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to get music", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/music/upload", authenticateToken, musicUpload.single('file'), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      if (!req.file.mimetype.startsWith('audio/')) {
        return res.status(400).json({ message: "Only audio files are allowed" });
      }

      const musicData = {
        userId: req.user!.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        filePath: `/uploads/${req.file.filename}`,
        fileSize: req.file.size,
        artist: 'Unknown Artist',
        duration: '0:00',
      };

      const music = await storage.createMusic(musicData);
      res.status(201).json(music);
    } catch (error) {
      res.status(500).json({ message: "Failed to upload music", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/music/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      const music = await storage.getMusicById(id, req.user!.id);
      if (!music) {
        return res.status(404).json({ message: "Music not found" });
      }

      // Delete the file from the filesystem
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(__dirname, '..', music.filePath);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await storage.deleteMusic(id, req.user!.id);
      res.json({ message: "Music deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete music", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
