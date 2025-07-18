from flask import Blueprint, request, jsonify
import logging
from datetime import datetime
from models import storage

assignments_bp = Blueprint('assignments', __name__)
logger = logging.getLogger(__name__)

@assignments_bp.route('', methods=['GET'])
def get_assignments():
    """Get all assignments"""
    try:
        assignments = storage.get_assignments()
        
        # Convert to dict format for JSON response
        assignments_list = []
        for assignment in assignments:
            assignment_dict = {
                'id': assignment.id,
                'title': assignment.title,
                'description': assignment.description,
                'type': assignment.type,
                'deadline': assignment.deadline.isoformat(),
                'status': assignment.status,
                'questions': assignment.questions,
                'relatedDocuments': assignment.related_documents,
                'createdAt': assignment.created_at.isoformat()
            }
            assignments_list.append(assignment_dict)
        
        return jsonify(assignments_list)
    except Exception as e:
        logger.error(f"Error getting assignments: {e}")
        return jsonify({'error': 'Failed to retrieve assignments'}), 500

@assignments_bp.route('/<int:assignment_id>', methods=['GET'])
def get_assignment(assignment_id):
    """Get a specific assignment"""
    try:
        assignment = storage.get_assignment(assignment_id)
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        assignment_dict = {
            'id': assignment.id,
            'title': assignment.title,
            'description': assignment.description,
            'type': assignment.type,
            'deadline': assignment.deadline.isoformat(),
            'status': assignment.status,
            'questions': assignment.questions,
            'relatedDocuments': assignment.related_documents,
            'createdAt': assignment.created_at.isoformat()
        }
        
        return jsonify(assignment_dict)
    except Exception as e:
        logger.error(f"Error getting assignment {assignment_id}: {e}")
        return jsonify({'error': 'Failed to retrieve assignment'}), 500

@assignments_bp.route('', methods=['POST'])
def create_assignment():
    """Create a new assignment"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate required fields
        if 'title' not in data or 'deadline' not in data:
            return jsonify({'error': 'Title and deadline are required'}), 400
        
        # Parse deadline
        try:
            deadline_str = data['deadline']
            # Handle both ISO format and form input format
            if 'T' in deadline_str:
                deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
            else:
                deadline = datetime.strptime(deadline_str, '%Y-%m-%dT%H:%M')
        except (ValueError, TypeError) as e:
            return jsonify({'error': 'Invalid deadline format'}), 400
        
        # Create assignment
        assignment_data = {
            'title': data['title'],
            'description': data.get('description'),
            'type': data.get('type', 'assignment'),
            'deadline': deadline,
            'status': data.get('status', 'pending'),
            'questions': data.get('questions'),
            'related_documents': data.get('relatedDocuments')
        }
        
        assignment = storage.create_assignment(**assignment_data)
        
        assignment_dict = {
            'id': assignment.id,
            'title': assignment.title,
            'description': assignment.description,
            'type': assignment.type,
            'deadline': assignment.deadline.isoformat(),
            'status': assignment.status,
            'questions': assignment.questions,
            'relatedDocuments': assignment.related_documents,
            'createdAt': assignment.created_at.isoformat()
        }
        
        return jsonify(assignment_dict), 201
    except Exception as e:
        logger.error(f"Error creating assignment: {e}")
        return jsonify({'error': 'Failed to create assignment'}), 500

@assignments_bp.route('/<int:assignment_id>', methods=['PATCH'])
def update_assignment(assignment_id):
    """Update an assignment"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Handle deadline update if provided
        if 'deadline' in data:
            try:
                deadline_str = data['deadline']
                if 'T' in deadline_str:
                    data['deadline'] = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
                else:
                    data['deadline'] = datetime.strptime(deadline_str, '%Y-%m-%dT%H:%M')
            except (ValueError, TypeError) as e:
                return jsonify({'error': 'Invalid deadline format'}), 400
        
        assignment = storage.update_assignment(assignment_id, **data)
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        assignment_dict = {
            'id': assignment.id,
            'title': assignment.title,
            'description': assignment.description,
            'type': assignment.type,
            'deadline': assignment.deadline.isoformat(),
            'status': assignment.status,
            'questions': assignment.questions,
            'relatedDocuments': assignment.related_documents,
            'createdAt': assignment.created_at.isoformat()
        }
        
        return jsonify(assignment_dict)
    except Exception as e:
        logger.error(f"Error updating assignment {assignment_id}: {e}")
        return jsonify({'error': 'Failed to update assignment'}), 500

@assignments_bp.route('/<int:assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    """Delete an assignment"""
    try:
        success = storage.delete_assignment(assignment_id)
        if not success:
            return jsonify({'error': 'Assignment not found'}), 404
        
        return jsonify({'message': 'Assignment deleted successfully'})
    except Exception as e:
        logger.error(f"Error deleting assignment {assignment_id}: {e}")
        return jsonify({'error': 'Failed to delete assignment'}), 500

@assignments_bp.route('/upcoming', methods=['GET'])
def get_upcoming_assignments():
    """Get assignments with upcoming deadlines"""
    try:
        assignments = storage.get_assignments()
        now = datetime.now()
        
        # Filter for upcoming assignments (not completed, deadline in the future)
        upcoming = []
        for assignment in assignments:
            if assignment.status != 'completed' and assignment.deadline > now:
                days_until_due = (assignment.deadline - now).days
                assignment_dict = {
                    'id': assignment.id,
                    'title': assignment.title,
                    'description': assignment.description,
                    'type': assignment.type,
                    'deadline': assignment.deadline.isoformat(),
                    'status': assignment.status,
                    'daysUntilDue': days_until_due,
                    'isUrgent': days_until_due <= 3,
                    'createdAt': assignment.created_at.isoformat()
                }
                upcoming.append(assignment_dict)
        
        # Sort by deadline (most urgent first)
        upcoming.sort(key=lambda a: a['deadline'])
        
        return jsonify(upcoming)
    except Exception as e:
        logger.error(f"Error getting upcoming assignments: {e}")
        return jsonify({'error': 'Failed to retrieve upcoming assignments'}), 500

@assignments_bp.route('/<int:assignment_id>/find-relevant', methods=['POST'])
def find_relevant_notes(assignment_id):
    """Find relevant notes/documents for an assignment using AI"""
    try:
        assignment = storage.get_assignment(assignment_id)
        if not assignment:
            return jsonify({'error': 'Assignment not found'}), 404
        
        # Get all documents
        documents = storage.get_documents()
        
        # Create search query from assignment title and description
        query = assignment.title
        if assignment.description:
            query += f" {assignment.description}"
        
        # Convert documents to format expected by AI service
        doc_data = []
        for doc in documents:
            if doc.extracted_text:
                doc_data.append({
                    'id': doc.id,
                    'original_name': doc.original_name,
                    'extracted_text': doc.extracted_text
                })
        
        if not doc_data:
            return jsonify({'result': 'No documents available to search'})
        
        # Use AI service to find relevant content
        from flask import current_app
        ai_service = current_app.ai_service
        result = ai_service.find_relevant_content(query, doc_data)
        
        return jsonify({
            'assignmentId': assignment_id,
            'query': query,
            'result': result,
            'documentsSearched': len(doc_data)
        })
    except Exception as e:
        logger.error(f"Error finding relevant notes for assignment {assignment_id}: {e}")
        return jsonify({'error': 'Failed to find relevant notes'}), 500

@assignments_bp.route('/stats', methods=['GET'])
def get_assignment_stats():
    """Get assignment statistics"""
    try:
        assignments = storage.get_assignments()
        now = datetime.now()
        
        total_assignments = len(assignments)
        completed = sum(1 for a in assignments if a.status == 'completed')
        in_progress = sum(1 for a in assignments if a.status == 'in_progress')
        pending = sum(1 for a in assignments if a.status == 'pending')
        overdue = sum(1 for a in assignments if a.deadline < now and a.status != 'completed')
        
        # Upcoming deadlines (next 7 days)
        week_from_now = now + datetime.timedelta(days=7)
        upcoming_week = sum(1 for a in assignments 
                          if now < a.deadline <= week_from_now and a.status != 'completed')
        
        stats = {
            'total': total_assignments,
            'completed': completed,
            'inProgress': in_progress,
            'pending': pending,
            'overdue': overdue,
            'upcomingThisWeek': upcoming_week,
            'completionRate': round((completed / total_assignments * 100) if total_assignments > 0 else 0, 1)
        }
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting assignment stats: {e}")
        return jsonify({'error': 'Failed to retrieve assignment statistics'}), 500
