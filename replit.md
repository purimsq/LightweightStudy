# StudyCompanion - Replit Architecture Guide

## Overview

StudyCompanion is a lightweight offline desktop study application built for personalized learning. It combines React frontend with Node.js/Express backend, featuring local AI integration via Ollama, document management, and intelligent study planning. The app is designed to be completely offline-capable with no cloud dependencies.

## Recent Changes (July 21, 2025)

### YouTube Music Search Issue Identified - Latest Update (July 21, 2025)  
- **YOUTUBE BLOCKING DETECTED**: Confirmed YouTube actively blocks yt-dlp with HTTP 429 errors and bot protection
- **UNRESTRICTED SEARCH IMPLEMENTED**: Removed all study music restrictions - now searches entire YouTube database for any song
- **DEMO DATA REMOVED**: Eliminated all mock/placeholder content, shows only real search results
- **CLEAR ERROR MESSAGING**: Added user-friendly explanation of YouTube blocking issue
- **TECHNICAL LIMITATION**: YouTube's bot protection prevents automated music access via yt-dlp
- **NEXT STEPS NEEDED**: Alternative music API or local music library system required for functionality

### Document Editor Fixes Complete - Previous Update (July 21, 2025)
- **DOCX CONTENT EXTRACTION**: Fixed server-side mammoth.js to properly extract actual document content from DOCX files
- **CURSOR PRESERVATION**: Implemented advanced cursor position tracking to prevent jumping during typing
- **STYLED CONTENT DISPLAY**: Fixed content to display with proper HTML styling after saving instead of raw HTML
- **SERVER-SIDE PROCESSING**: Moved DOCX extraction to server for more reliable document parsing
- **PDF TEXT EXTRACTION**: Implemented server-side PDF text extraction using Ghostscript with clean document formatting
- **ERROR HANDLING**: Added comprehensive error handling with user-friendly fallbacks
- **REAL CONTENT LOADING**: Users now see actual document text content extracted from uploaded DOCX files

### Document Integration Complete - Previous Update (July 21, 2025)
- **MAMMOTH.JS INTEGRATION**: Added proper DOCX document parsing and rendering with styled HTML output
- **PDF.JS INTEGRATION**: Implemented PDF text extraction with page-by-page viewing and clean formatting
- **DOCUMENT STYLING**: Created comprehensive CSS styling system for consistent document display
- **PROPER HTML RENDERING**: Documents now display with beautiful typography instead of raw HTML tags
- **EDITING CONSISTENCY**: Both view and edit modes use identical styling for seamless experience
- **LOADING STATES**: Added proper loading indicators for document processing operations

### Assignment System Restored - Previous Update  
- **RESTORED TO YESTERDAY'S VERSION**: Completely reverted to the simple, working system from last night
- **Simple Modal Editor**: Clean modal-based editing with yellow background feedback
- **Click-to-Edit**: Simple click anywhere to start editing workflow
- **Save/Cancel Controls**: Clean green save and cancel buttons in header
- **Zero Crashes**: All complex code removed - back to stable, working version
- **User's Working Version**: Exactly how it was working perfectly yesterday night

### Beautiful Progress Page Implementation - Previous Update
- **Animated Loading Screen**: Created stunning 3-second welcome animation specifically for Mitchell
- **Real Unit Integration**: Progress page now displays actual units with progress bars and charts
- **Unit-Progress System**: Automatic progress bar creation/deletion when units are added/removed
- **API Endpoints**: Added full /api/unit-progress endpoints for GET, PATCH operations
- **Live Progress Tracking**: Real-time calculation of completion percentages and trends
- **Beautiful Statistics**: Overview cards showing overall progress, improving units, and study streaks
- **Visual Charts**: Area charts showing progress trends over time for each unit

### Document Backend Fixes - Complete Resolution
- **PDF Viewer Configuration**: Fixed pdf.js worker source to use proper CDN loading
- **DOCX Viewer Issues**: Resolved mammoth library configuration for document conversion
- **Document Editing System**: Added full editing capabilities with real-time save functionality
- **Assignment File Viewer**: Created comprehensive assignment document viewer with editing
- **Download Functionality**: Fixed download to save edited version instead of original file
- **Backend API Completion**: Added missing getAssignment endpoint for individual assignment loading
- **Visual Status Indicators**: Added modification tracking and visual cues for document changes

### Assignment Modal Enhancements - Latest Updates
- **Floating Modal Interface**: Converted assignment viewer from page navigation to large floating modal (95% screen space)
- **Document Rendering Fix**: Fixed editable documents to render HTML with proper styling instead of raw HTML tags
- **Scrolling Implementation**: Added proper overflow controls and scrolling functionality to DOCX viewer
- **Enhanced Modal Layout**: Improved modal container with height constraints for better document viewing experience
- **Integrated Viewers**: Successfully integrated PDFViewer, DOCXViewer, and EditableDocument components within modal

### LuvNoir Music Streaming App - Complete Redesign
- **Full-Screen Music Interface**: Completely redesigned music page with premium look and feel
- **Back Button Navigation**: Easy return to study app from music interface
- **Animated Equalizer Bars**: Small animated music bars next to LuvNoir icon when music is playing
- **Modern UI Design**: Beautiful gradient backgrounds, glass morphism effects, and smooth animations
- **Trending Music Section**: Grid layout showing popular songs with play counts and artist info
- **Curated Playlists**: Six-column playlist grid with hover effects and song counts
- **Advanced Music Player**: Large hero section with progress bar, volume control, and full media controls
- **Search Functionality**: Rounded search bar with backend integration ready for yt-dlp
- **Navigation Pills**: Discover, Playlists, Radio, Recently Played, Favorites sections

### Previous AI Integration (July 19, 2025)
- **Ollama Integration**: Full local AI assistant with phi model support
- **Complete App Access**: AI can control all features with approval requirements
- **Smart Health Checks**: Automatic detection of Ollama service and available models
- **Real-time Connection Status**: Live monitoring of AI service availability
- **Full Access Capabilities**: AI can navigate, create, update, delete content with user approval
- **Break Reminders**: Automated study break suggestions based on session length

### Extreme Large File Optimizations
- **500MB File Support**: Enhanced limits for massive academic textbooks and documents
- **PDF Optimization**: Advanced rendering settings for 1000+ page documents
- **Memory Management**: Automatic cleanup and garbage collection for large files
- **Progress Tracking**: Real-time loading indicators for large document processing
- **Error Handling**: Comprehensive error messages for various file loading scenarios

### Previous Core Functionality (All Verified Working)
- **Document Upload & Display**: Fixed schema mismatches, documents display properly
- **File Serving**: Static file serving with range requests for large files
- **Document Viewers**: PDF and DOCX viewers with extreme performance optimizations
- **Navigation Flow**: Proper routing between all pages and features
- **Delete System**: Two-step confirmation for all content types
- **Notes System**: Markdown support with header formatting
- **Zero Crashes**: Complete stability verification across all features

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
- **FULL APP ACCESS**: Ollama can access and control everything in the app - documents, notes, quizzes, summaries, study plans, assignments, units, navigation, features
- **APPROVAL REQUIREMENT**: AI must ask "May I [specific action]?" before making any changes or modifications
- **Smart Summaries**: AI-generated document summaries with user approval
- **Study Planning**: Intelligent daily study plan generation
- **Content Matching**: Semantic search for assignment-note correlation
- **Complete Control**: AI can navigate, create, update, delete any content with approval

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