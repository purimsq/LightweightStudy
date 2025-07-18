from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import logging
from models import storage

documents_bp = Blueprint('documents', __name__)
logger = logging.getLogger(__name__)

@documents_bp.route('', methods=['GET'])
def get_documents():
    """Get all documents or documents for a specific unit"""
    try:
        unit_id = request.args.get('unitId', type=int)
        documents = storage.get_documents(unit_id)
        
        # Convert to dict format for JSON response
        documents_list = []
        for doc in documents:
            doc_dict = {
                'id': doc.id,
                'unitId': doc.unit_id,
                'filename': doc.filename,
                'originalName': doc.original_name,
                'fileType': doc.file_type,
                'filePath': doc.file_path,
                'extractedText': doc.extracted_text,
                'summary': doc.summary,
                'embeddings': doc.embeddings,
                'uploadedAt': doc.uploaded_at.isoformat()
            }
            documents_list.append(doc_dict)
        
        return jsonify(documents_list)
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        return jsonify({'error': 'Failed to retrieve documents'}), 500

@documents_bp.route('', methods=['POST'])
def upload_document():
    """Upload and process a new document"""
    try:
        # Handle both file upload and JSON data
        if 'file' in request.files:
            # File upload
            file = request.files['file']
            unit_id = request.form.get('unitId', type=int)
            
            if not file or file.filename == '':
                return jsonify({'error': 'No file provided'}), 400
            
            # Process the document
            processor = current_app.document_processor
            result = processor.process_document(file, current_app.config['UPLOAD_FOLDER'], unit_id)
            
            if result['status'] == 'error':
                return jsonify({'error': result['error']}), 400
            
            # Save document metadata to storage
            doc = storage.create_document(
                unit_id=result['unit_id'],
                filename=result['filename'],
                original_name=result['original_name'],
                file_type=result['file_type'],
                file_path=result['file_path'],
                extracted_text=result['extracted_text']
            )
            
        else:
            # JSON data (from frontend simulation)
            data = request.get_json()
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            doc = storage.create_document(**data)
        
        # Return document data
        doc_dict = {
            'id': doc.id,
            'unitId': doc.unit_id,
            'filename': doc.filename,
            'originalName': doc.original_name,
            'fileType': doc.file_type,
            'filePath': doc.file_path,
            'extractedText': doc.extracted_text,
            'summary': doc.summary,
            'embeddings': doc.embeddings,
            'uploadedAt': doc.uploaded_at.isoformat()
        }
        
        return jsonify(doc_dict), 201
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        return jsonify({'error': 'Failed to upload document'}), 500

@documents_bp.route('/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    """Get a specific document"""
    try:
        doc = storage.get_document(doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        
        doc_dict = {
            'id': doc.id,
            'unitId': doc.unit_id,
            'filename': doc.filename,
            'originalName': doc.original_name,
            'fileType': doc.file_type,
            'filePath': doc.file_path,
            'extractedText': doc.extracted_text,
            'summary': doc.summary,
            'embeddings': doc.embeddings,
            'uploadedAt': doc.uploaded_at.isoformat()
        }
        
        return jsonify(doc_dict)
    except Exception as e:
        logger.error(f"Error getting document {doc_id}: {e}")
        return jsonify({'error': 'Failed to retrieve document'}), 500

@documents_bp.route('/<int:doc_id>', methods=['PATCH'])
def update_document(doc_id):
    """Update document metadata"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        doc = storage.update_document(doc_id, **data)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        
        doc_dict = {
            'id': doc.id,
            'unitId': doc.unit_id,
            'filename': doc.filename,
            'originalName': doc.original_name,
            'fileType': doc.file_type,
            'filePath': doc.file_path,
            'extractedText': doc.extracted_text,
            'summary': doc.summary,
            'embeddings': doc.embeddings,
            'uploadedAt': doc.uploaded_at.isoformat()
        }
        
        return jsonify(doc_dict)
    except Exception as e:
        logger.error(f"Error updating document {doc_id}: {e}")
        return jsonify({'error': 'Failed to update document'}), 500

@documents_bp.route('/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Delete a document"""
    try:
        doc = storage.get_document(doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        
        # Delete the file from disk
        processor = current_app.document_processor
        processor.delete_file(doc.file_path)
        
        # Delete from storage
        success = storage.delete_document(doc_id)
        if not success:
            return jsonify({'error': 'Failed to delete document'}), 500
        
        return jsonify({'message': 'Document deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting document {doc_id}: {e}")
        return jsonify({'error': 'Failed to delete document'}), 500

@documents_bp.route('/<int:doc_id>/summary', methods=['POST'])
def generate_summary(doc_id):
    """Generate AI summary for a document"""
    try:
        doc = storage.get_document(doc_id)
        if not doc:
            return jsonify({'error': 'Document not found'}), 404
        
        if not doc.extracted_text:
            return jsonify({'error': 'No text available for summary'}), 400
        
        # Generate summary using AI service
        ai_service = current_app.ai_service
        summary = ai_service.generate_summary(doc.extracted_text)
        
        # Update document with summary
        storage.update_document(doc_id, summary=summary)
        
        return jsonify({'summary': summary})
    except Exception as e:
        logger.error(f"Error generating summary for document {doc_id}: {e}")
        return jsonify({'error': 'Failed to generate summary'}), 500

@documents_bp.route('/search', methods=['POST'])
def search_documents():
    """Search documents using AI for relevant content"""
    try:
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'Query is required'}), 400
        
        query = data['query']
        unit_id = data.get('unitId')
        
        # Get documents to search
        documents = storage.get_documents(unit_id)
        
        # Convert to format expected by AI service
        doc_data = []
        for doc in documents:
            if doc.extracted_text:
                doc_data.append({
                    'id': doc.id,
                    'original_name': doc.original_name,
                    'extracted_text': doc.extracted_text
                })
        
        if not doc_data:
            return jsonify({'result': 'No documents found to search'})
        
        # Use AI service to find relevant content
        ai_service = current_app.ai_service
        result = ai_service.find_relevant_content(query, doc_data)
        
        return jsonify({'result': result, 'documents_searched': len(doc_data)})
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        return jsonify({'error': 'Failed to search documents'}), 500
