# StudyCompanion - Lightweight Offline Study App

StudyCompanion is a complete offline desktop study application designed specifically for personalized learning. Built with React, Flask, and local AI integration via Ollama, it provides a private, secure, and fully offline study environment.

## 🌟 Features

### 📚 Study Management
- **Document Organization**: Upload and organize PDFs/DOCX by study units (Anatomy, Immunology, etc.)
- **Smart Note-Taking**: Markdown-style notes with `~` prefix support and line breaks
- **Unit Management**: Create custom study units with progress tracking
- **Assignment & CAT Tracking**: Manage assignments and continuous assessment tests with deadlines

### 🤖 AI-Powered Features
- **Local AI Assistant**: Powered by Ollama with phi model (100% offline)
- **Intelligent Summaries**: AI-generated document summaries (with user approval)
- **Study Plan Generation**: Personalized daily study plans based on deadlines and pace
- **Smart Content Matching**: AI finds relevant notes for assignments and CATs
- **Study Motivation**: Encouraging messages and progress insights

### 🎯 Personalization
- **Learning Pace Control**: 1-80 scale slider for customized study speed
- **Break Reminders**: Automatic break suggestions based on study time
- **Progress Tracking**: Visual progress indicators and study streaks
- **Kenyan Timezone Support**: Real-time clock with local timezone awareness

### 🔒 Privacy & Offline
- **100% Offline**: No internet connection required after setup
- **Local Storage**: All data stored locally, no cloud dependency
- **Private AI**: AI processing happens entirely on your device
- **Secure**: No data leaves your computer

## 🛠️ Technical Stack

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Python Flask with document processing and AI integration
- **Desktop**: Tauri for native desktop app packaging
- **AI**: Ollama with phi model for local AI processing
- **Storage**: In-memory storage with local file system for documents

## 📋 System Requirements

- **OS**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space (for Ollama and phi model)
- **Python**: 3.7 or later
- **Node.js**: 16.0 or later
- **Rust**: Latest stable version (for Tauri)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/studycompanion/app.git
cd studycompanion
```

### 2. YouTube API Setup (for Music Streaming)

The music streaming feature requires a YouTube Data API v3 key. Follow these steps:

#### Get Your YouTube API Key:
1. **Go to Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Create/Select Project**: Create a new project or select an existing one
3. **Enable Billing**: YouTube API requires billing to be enabled
4. **Enable YouTube Data API v3**:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
5. **Create API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key

#### Configure the API Key:
**Option A: Environment Variable (Recommended)**
```bash
# Create a .env file in the server directory
echo "YOUTUBE_API_KEY=your_actual_api_key_here" > server/.env
```

**Option B: Direct Replacement**
Replace `YOUR_YOUTUBE_API_KEY_HERE` in `server/routes.ts` with your actual API key.

#### API Quota Information:
- **Free Tier**: 10,000 units per day
- **Search Queries**: ~100 units per search
- **Video Details**: ~1 unit per video
- **Suggestions**: ~5 units per request

> 💡 **Tip**: The free tier is sufficient for personal use. For heavy usage, consider upgrading to a paid plan.
