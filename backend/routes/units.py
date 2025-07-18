from flask import Blueprint, request, jsonify
import logging
from models import storage

units_bp = Blueprint('units', __name__)
logger = logging.getLogger(__name__)

@units_bp.route('', methods=['GET'])
def get_units():
    """Get all units"""
    try:
        units = storage.get_units()
        
        # Convert to dict format for JSON response
        units_list = []
        for unit in units:
            unit_dict = {
                'id': unit.id,
                'name': unit.name,
                'description': unit.description,
                'color': unit.color,
                'icon': unit.icon,
                'totalTopics': unit.total_topics,
                'completedTopics': unit.completed_topics,
                'createdAt': unit.created_at.isoformat()
            }
            units_list.append(unit_dict)
        
        return jsonify(units_list)
    except Exception as e:
        logger.error(f"Error getting units: {e}")
        return jsonify({'error': 'Failed to retrieve units'}), 500

@units_bp.route('/<int:unit_id>', methods=['GET'])
def get_unit(unit_id):
    """Get a specific unit"""
    try:
        unit = storage.get_unit(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
        unit_dict = {
            'id': unit.id,
            'name': unit.name,
            'description': unit.description,
            'color': unit.color,
            'icon': unit.icon,
            'totalTopics': unit.total_topics,
            'completedTopics': unit.completed_topics,
            'createdAt': unit.created_at.isoformat()
        }
        
        return jsonify(unit_dict)
    except Exception as e:
        logger.error(f"Error getting unit {unit_id}: {e}")
        return jsonify({'error': 'Failed to retrieve unit'}), 500

@units_bp.route('', methods=['POST'])
def create_unit():
    """Create a new unit"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if 'name' not in data:
            return jsonify({'error': 'Unit name is required'}), 400
        
        # Create unit
        unit = storage.create_unit(**data)
        
        unit_dict = {
            'id': unit.id,
            'name': unit.name,
            'description': unit.description,
            'color': unit.color,
            'icon': unit.icon,
            'totalTopics': unit.total_topics,
            'completedTopics': unit.completed_topics,
            'createdAt': unit.created_at.isoformat()
        }
        
        return jsonify(unit_dict), 201
    except Exception as e:
        logger.error(f"Error creating unit: {e}")
        return jsonify({'error': 'Failed to create unit'}), 500

@units_bp.route('/<int:unit_id>', methods=['PATCH'])
def update_unit(unit_id):
    """Update a unit"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        unit = storage.update_unit(unit_id, **data)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
        unit_dict = {
            'id': unit.id,
            'name': unit.name,
            'description': unit.description,
            'color': unit.color,
            'icon': unit.icon,
            'totalTopics': unit.total_topics,
            'completedTopics': unit.completed_topics,
            'createdAt': unit.created_at.isoformat()
        }
        
        return jsonify(unit_dict)
    except Exception as e:
        logger.error(f"Error updating unit {unit_id}: {e}")
        return jsonify({'error': 'Failed to update unit'}), 500

@units_bp.route('/<int:unit_id>', methods=['DELETE'])
def delete_unit(unit_id):
    """Delete a unit and all its associated documents"""
    try:
        success = storage.delete_unit(unit_id)
        if not success:
            return jsonify({'error': 'Unit not found'}), 404
        
        return jsonify({'message': 'Unit deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting unit {unit_id}: {e}")
        return jsonify({'error': 'Failed to delete unit'}), 500

@units_bp.route('/<int:unit_id>/progress', methods=['PATCH'])
def update_unit_progress(unit_id):
    """Update unit progress (completed topics)"""
    try:
        data = request.get_json()
        if not data or 'completedTopics' not in data:
            return jsonify({'error': 'completedTopics is required'}), 400
        
        completed_topics = data['completedTopics']
        if not isinstance(completed_topics, int) or completed_topics < 0:
            return jsonify({'error': 'completedTopics must be a non-negative integer'}), 400
        
        unit = storage.update_unit(unit_id, completed_topics=completed_topics)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
        unit_dict = {
            'id': unit.id,
            'name': unit.name,
            'description': unit.description,
            'color': unit.color,
            'icon': unit.icon,
            'totalTopics': unit.total_topics,
            'completedTopics': unit.completed_topics,
            'createdAt': unit.created_at.isoformat()
        }
        
        return jsonify(unit_dict)
    except Exception as e:
        logger.error(f"Error updating unit progress {unit_id}: {e}")
        return jsonify({'error': 'Failed to update unit progress'}), 500

@units_bp.route('/<int:unit_id>/documents', methods=['GET'])
def get_unit_documents(unit_id):
    """Get all documents for a specific unit"""
    try:
        # Check if unit exists
        unit = storage.get_unit(unit_id)
        if not unit:
            return jsonify({'error': 'Unit not found'}), 404
        
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
        logger.error(f"Error getting documents for unit {unit_id}: {e}")
        return jsonify({'error': 'Failed to retrieve unit documents'}), 500

@units_bp.route('/stats', methods=['GET'])
def get_units_stats():
    """Get overall statistics for all units"""
    try:
        units = storage.get_units()
        
        total_units = len(units)
        total_topics = sum(unit.total_topics for unit in units)
        total_completed = sum(unit.completed_topics for unit in units)
        completion_rate = (total_completed / total_topics * 100) if total_topics > 0 else 0
        
        # Calculate unit-wise progress
        unit_progress = []
        for unit in units:
            progress = (unit.completed_topics / unit.total_topics * 100) if unit.total_topics > 0 else 0
            unit_progress.append({
                'unitId': unit.id,
                'unitName': unit.name,
                'progress': round(progress, 1),
                'completedTopics': unit.completed_topics,
                'totalTopics': unit.total_topics
            })
        
        stats = {
            'totalUnits': total_units,
            'totalTopics': total_topics,
            'totalCompleted': total_completed,
            'overallProgress': round(completion_rate, 1),
            'unitProgress': unit_progress
        }
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting unit stats: {e}")
        return jsonify({'error': 'Failed to retrieve unit statistics'}), 500
