#!/bin/bash

# StudyCompanion Setup Script
# This script installs Ollama and the phi model for local AI functionality

set -e

echo "🎓 StudyCompanion Setup Script"
echo "================================"
echo "This script will install:"
echo "1. Ollama (Local AI runtime)"
echo "2. Phi model (Lightweight AI model)"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to detect OS
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

# Function to install Ollama
install_ollama() {
    local os=$(detect_os)
    
    echo "📦 Installing Ollama for $os..."
    
    case $os in
        "linux"|"macos")
            if command_exists curl; then
                curl -fsSL https://ollama.ai/install.sh | sh
            else
                echo "❌ Error: curl is required but not installed."
                echo "Please install curl and run this script again."
                exit 1
            fi
            ;;
        "windows")
            echo "⚠️  For Windows, please:"
            echo "1. Download Ollama from: https://ollama.ai/download/windows"
            echo "2. Run the installer"
            echo "3. After installation, run this script again to install the phi model"
            read -p "Press Enter when Ollama is installed..."
            ;;
        *)
            echo "❌ Unsupported operating system: $os"
            echo "Please visit https://ollama.ai for manual installation instructions."
            exit 1
            ;;
    esac
}

# Function to check if Ollama is running
check_ollama_running() {
    if command_exists curl; then
        if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Function to start Ollama service
start_ollama() {
    echo "🚀 Starting Ollama service..."
    
    if command_exists ollama; then
        # Start Ollama in the background
        ollama serve &
        OLLAMA_PID=$!
        
        # Wait for Ollama to start
        echo "⏳ Waiting for Ollama to start..."
        for i in {1..30}; do
            if check_ollama_running; then
                echo "✅ Ollama is running!"
                return 0
            fi
            sleep 2
        done
        
        echo "❌ Failed to start Ollama"
        return 1
    else
        echo "❌ Ollama command not found"
        return 1
    fi
}

# Function to install phi model
install_phi_model() {
    echo "🧠 Installing phi model..."
    
    if command_exists ollama; then
        echo "📥 Downloading phi model (this may take a few minutes)..."
        ollama pull phi
        
        if [ $? -eq 0 ]; then
            echo "✅ Phi model installed successfully!"
            
            # Test the model
            echo "🧪 Testing phi model..."
            response=$(ollama run phi "Hello, can you help me study?" --format json 2>/dev/null || echo "")
            if [ -n "$response" ]; then
                echo "✅ Phi model is working correctly!"
            else
                echo "⚠️  Phi model installed but test failed. This might be normal."
            fi
        else
            echo "❌ Failed to install phi model"
            return 1
        fi
    else
        echo "❌ Ollama command not found"
        return 1
    fi
}

# Function to install Python dependencies
install_python_deps() {
    echo "🐍 Installing Python dependencies..."
    
    if command_exists python3; then
        PYTHON_CMD="python3"
    elif command_exists python; then
        PYTHON_CMD="python"
    else
        echo "❌ Python is not installed. Please install Python 3.7+ and run this script again."
        return 1
    fi
    
    if command_exists pip3; then
        PIP_CMD="pip3"
    elif command_exists pip; then
        PIP_CMD="pip"
    else
        echo "❌ pip is not installed. Please install pip and run this script again."
        return 1
    fi
    
    # Check if we're in the correct directory
    if [ -f "backend/requirements.txt" ]; then
        echo "📦 Installing backend dependencies..."
        $PIP_CMD install -r backend/requirements.txt
        echo "✅ Python dependencies installed!"
    else
        echo "⚠️  requirements.txt not found. Skipping Python dependencies."
        echo "Make sure you're running this script from the StudyCompanion root directory."
    fi
}

# Function to create desktop shortcut (Linux/macOS)
create_desktop_shortcut() {
    local os=$(detect_os)
    
    if [[ "$os" == "linux" ]]; then
        echo "🖥️  Creating desktop shortcut..."
        
        cat > ~/Desktop/StudyCompanion.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=StudyCompanion
Comment=Lightweight offline study companion
Exec=$(pwd)/target/release/studycompanion
Icon=$(pwd)/src-tauri/icons/128x128.png
Terminal=false
Categories=Education;
EOF
        
        chmod +x ~/Desktop/StudyCompanion.desktop
        echo "✅ Desktop shortcut created!"
    fi
}

# Main setup process
main() {
    echo "🔍 Checking system requirements..."
    
    # Check if Ollama is already installed
    if command_exists ollama; then
        echo "✅ Ollama is already installed"
        
        # Check if it's running
        if ! check_ollama_running; then
            start_ollama
        else
            echo "✅ Ollama is already running"
        fi
    else
        echo "📦 Ollama not found, installing..."
        install_ollama
        
        # Start Ollama after installation
        start_ollama
    fi
    
    # Install phi model
    echo ""
    echo "🧠 Checking phi model..."
    if ollama list | grep -q "phi"; then
        echo "✅ Phi model is already installed"
    else
        install_phi_model
    fi
    
    # Install Python dependencies
    echo ""
    install_python_deps
    
    # Create desktop shortcut
    echo ""
    create_desktop_shortcut
    
    echo ""
    echo "🎉 Setup completed successfully!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Install Node.js dependencies: npm install"
    echo "2. Build the frontend: npm run build"
    echo "3. Install Tauri CLI: cargo install tauri-cli"
    echo "4. Build the desktop app: cargo tauri build"
    echo ""
    echo "🚀 To run in development mode:"
    echo "   cargo tauri dev"
    echo ""
    echo "📚 The app includes:"
    echo "   • Document upload and processing (PDF/DOCX)"
    echo "   • AI-powered study assistance"
    echo "   • Study plan generation"
    echo "   • Note-taking with markdown support"
    echo "   • Assignment and CAT tracking"
    echo ""
    echo "❓ Need help? Check the README.md file"
}

# Handle script interruption
trap 'echo ""; echo "❌ Setup interrupted. You can run this script again to continue."; exit 1' INT

# Run main function
main

# Keep Ollama running if we started it
if [ ! -z "$OLLAMA_PID" ]; then
    echo "💡 Ollama is running in the background (PID: $OLLAMA_PID)"
    echo "   To stop it later, run: kill $OLLAMA_PID"
fi

echo ""
echo "✨ StudyCompanion setup complete! Happy studying! ✨"
