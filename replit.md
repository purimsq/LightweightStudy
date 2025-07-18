# StudyCompanion - Replit Architecture Guide

## Overview

StudyCompanion is a lightweight offline desktop study application built for personalized learning. It combines React frontend with Node.js/Express backend, featuring local AI integration via Ollama, document management, and intelligent study planning. The app is designed to be completely offline-capable with no cloud dependencies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state, local storage for client state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: In-memory storage with fallback to database
- **File Processing**: Built-in document processing for PDFs and DOCX files
- **AI Integration**: Local Ollama service communication via HTTP

### Desktop App Packaging
- **Framework**: Tauri for native desktop app creation
- **Target Platforms**: Windows, macOS, and Linux
- **Build Strategy**: Hybrid approach with web frontend and native backend

## Key Components

### Document Management System
- **File Upload**: Supports PDF and DOCX formats
- **Text Extraction**: Automated content parsing and indexing
- **Organization**: Unit-based categorization system
- **Storage**: Local file system with database metadata

### AI-Powered Features
- **Local AI**: Ollama with phi model for offline processing
- **Smart Summaries**: AI-generated document summaries with user approval
- **Study Planning**: Intelligent daily study plan generation
- **Content Matching**: Semantic search for assignment-note correlation

### Study Management
- **Units**: Hierarchical organization of study materials
- **Progress Tracking**: Visual progress indicators and completion metrics
- **Assignment Management**: CAT and assignment tracking with deadlines
- **Note-Taking**: Markdown-style notes with special syntax support

### User Experience
- **Learning Pace**: Adjustable 1-80 scale for personalized study speed
- **Break Reminders**: Automatic break suggestions based on study time
- **Kenyan Timezone**: Real-time clock with local timezone awareness
- **Motivational Elements**: Encouraging messages and progress insights

## Data Flow

### Document Processing Pipeline
1. File upload through drag-and-drop or file picker
2. Server-side text extraction and validation
3. Optional AI summary generation (with user approval)
4. Storage in local database with file system references
5. Unit assignment and progress tracking updates

### Study Plan Generation
1. User pace and deadline input collection
2. AI analysis of content volume and complexity
3. Intelligent scheduling considering weekends and breaks
4. Daily plan presentation with progress tracking
5. Adaptive rescheduling based on completion rates

### AI Interaction Flow
1. User query submission through chat interface
2. Context gathering from relevant documents and notes
3. Local Ollama API communication for response generation
4. Response formatting and conversation history management
5. Optional action suggestions (summaries, quizzes, etc.)

## External Dependencies

### Core Dependencies
- **Ollama**: Local AI service running phi model
- **PostgreSQL**: Database for structured data storage
- **Drizzle ORM**: Type-safe database operations
- **TanStack Query**: Server state management
- **Tauri**: Desktop app framework

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **date-fns**: Date manipulation utilities

### File Processing
- **PDF Processing**: Built-in text extraction capabilities
- **DOCX Processing**: Document parsing and content extraction
- **File System**: Local storage management

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with hot module replacement
- **Backend**: Node.js with Express and development middleware
- **Database**: Local PostgreSQL instance
- **AI Service**: Local Ollama installation with phi model

### Production Build
- **Frontend**: Vite production build with optimization
- **Backend**: Node.js production server with clustering
- **Database**: PostgreSQL with connection pooling
- **Desktop App**: Tauri-generated native executables

### Installation Process
1. Clone repository from GitHub
2. Install Node.js and Python dependencies
3. Set up local PostgreSQL database
4. Install and configure Ollama with phi model
5. Run database migrations
6. Build frontend and backend
7. Generate Tauri desktop installer

### Privacy and Security
- **Offline Operation**: No internet connectivity required after setup
- **Local Data**: All user data stored locally
- **Private AI**: AI processing entirely on user device
- **No Telemetry**: No data collection or external communication

The architecture prioritizes user privacy, offline capability, and personalized learning while maintaining a clean, intuitive interface that doesn't overwhelm non-technical users.