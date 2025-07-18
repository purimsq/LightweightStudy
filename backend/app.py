from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import logging
from datetime import datetime

# Import routes
from routes.documents import documents_bp
from routes.units import units_bp
from routes.assignments import assignments_bp
from routes.study_plan import study_plan_bp
from routes.ai_chat import ai_chat_bp

# Import services
from services.document_processor import DocumentProcessor
from services.ai_service import AIService
from services.study_planner import StudyPlanner

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for frontend communication
    CORS(app, origins=["http://localhost:5000", "http://127.0.0.1:5000"])
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'lightweight-study-app-secret')
    app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    # Create upload directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Initialize services
    document_processor = DocumentProcessor()
    ai_service = AIService()
    study_planner = StudyPlanner()
    
    # Store services in app context for access in routes
    app.document_processor = document_processor
    app.ai_service = ai_service
    app.study_planner = study_planner
    
    # Register blueprints
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(units_bp, url_prefix='/api/units')
    app.register_blueprint(assignments_bp, url_prefix='/api/assignments')
    app.register_blueprint(study_plan_bp, url_prefix='/api/study-plans')
    app.register_blueprint(ai_chat_bp, url_prefix='/api/ai')
    
    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'services': {
                'document_processor': 'online',
                'ai_service': ai_service.check_connection(),
                'study_planner': 'online'
            }
        })
    
    # Error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error)}), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'The requested resource was not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"Internal error: {error}")
        return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500
    
    @app.errorhandler(413)
    def file_too_large(error):
        return jsonify({'error': 'File too large', 'message': 'File size exceeds maximum limit of 16MB'}), 413
    
    return app

if __name__ == '__main__':
    app = create_app()
    
    # Get port from environment variable or default to 8000
    port = int(os.environ.get('PORT', 8000))
    
    logger.info(f"Starting StudyCompanion backend on port {port}")
    logger.info(f"Upload folder: {app.config['UPLOAD_FOLDER']}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.environ.get('FLASK_ENV') == 'development'
    )
