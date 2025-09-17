#!/usr/bin/env python3
import os
import sys

# Disable Flask's automatic .env loading
os.environ['FLASK_SKIP_DOTENV'] = '1'

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import and run the Flask app
from backend.app import create_app

if __name__ == '__main__':
    app = create_app()
    
    # Get port from environment variable or default to 8000
    port = int(os.environ.get('PORT', 8000))
    
    print(f"Starting StudyCompanion backend on port {port}")
    print(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )
