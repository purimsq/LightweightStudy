from flask import Blueprint, request, jsonify, current_app
import logging
from datetime import datetime
from models import storage

ai_chat_bp = Blueprint('ai_chat', __name__)
logger = logging.getLogger(__name__)

@ai_chat_bp.route('/health', methods=['GET'])
def health_check():
    """Check AI service health and model availability"""
    try:
        ai_service = current_app.ai_service
        connection_status = ai_service.check_connection()
        
        if connection_status == "connected_with_phi":
            return jsonify({
                'status': 'connected',
                'hasPhiModel': True,
                'message': 'Ollama is ready with phi model'
            })
        elif connection_status == "connected_no_phi":
            return jsonify({
                'status': 'connected',
                'hasPhiModel': False,
                'message': 'Ollama connected but phi model not found'
            })
        else:
            return jsonify({
                'status': 'disconnected',
                'hasPhiModel': False,
                'message': 'Cannot connect to Ollama. Make sure it\'s running on localhost:11434'
            }), 503
            
    except Exception as e:
        logger.error(f"Error checking AI health: {e}")
        return jsonify({
            'status': 'error',
            'hasPhiModel': False,
            'message': f'Health check failed: {str(e)}'
        }), 500

@ai_chat_bp.route('/chat', methods=['POST'])
def chat():
    """Send message to AI and get response"""
    try:
        data = request.get_json()
        if not data or 'message' not in data or 'sessionId' not in data:
            return jsonify({'error': 'Message and sessionId are required'}), 400
        
        message = data['message'].strip()
        session_id = data['sessionId']
        
        if not message:
            return jsonify({'error': 'Message cannot be empty'}), 400
        
        # Get or create chat session
        chat = storage.get_ai_chat_by_session(session_id)
        
        # Generate AI response
        ai_service = current_app.ai_service
        
        # Get context from previous messages if chat exists
        context = ""
        if chat and chat.messages:
            # Use last few messages for context
            recent_messages = chat.messages[-6:]  # Last 3 exchanges
            context = "\n".join([
                f"{'User' if msg.get('role') == 'user' else 'Assistant'}: {msg.get('content', '')}"
                for msg in recent_messages
            ])
        
        ai_response = ai_service.generate_response(message, context)
        
        # Create message objects
        user_message = {
            'role': 'user',
            'content': message,
            'timestamp': datetime.now().isoformat()
        }
        
        ai_message = {
            'role': 'assistant',
            'content': ai_response,
            'timestamp': datetime.now().isoformat()
        }
        
        # Update or create chat
        if chat:
            # Add new messages to existing chat
            updated_messages = chat.messages + [user_message, ai_message]
            chat = storage.update_ai_chat(chat.id, messages=updated_messages)
        else:
            # Create new chat
            chat = storage.create_ai_chat(
                session_id=session_id,
                messages=[user_message, ai_message]
            )
        
        # Prepare response
        chat_dict = {
            'id': chat.id,
            'messages': chat.messages,
            'sessionId': chat.session_id,
            'createdAt': chat.created_at.isoformat(),
            'updatedAt': chat.updated_at.isoformat()
        }
        
        return jsonify({
            'response': ai_response,
            'chat': chat_dict
        })
        
    except Exception as e:
        logger.error(f"Error in AI chat: {e}")
        return jsonify({'error': f'AI chat failed: {str(e)}'}), 500

@ai_chat_bp.route('/generate-summary', methods=['POST'])
def generate_summary():
    """Generate AI summary for given text"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'Text is required'}), 400
        
        text = data['text']
        max_length = data.get('maxLength', 300)
        
        if not text.strip():
            return jsonify({'error': 'Text cannot be empty'}), 400
        
        ai_service = current_app.ai_service
        summary = ai_service.generate_summary(text, max_length)
        
        return jsonify({'summary': summary})
        
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        return jsonify({'error': f'Summary generation failed: {str(e)}'}), 500

@ai_chat_bp.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    """Generate quiz questions for a topic"""
    try:
        data = request.get_json()
        if not data or 'topic' not in data:
            return jsonify({'error': 'Topic is required'}), 400
        
        topic = data['topic']
        content = data.get('content', '')
        difficulty = data.get('difficulty', 'medium')
        num_questions = data.get('numQuestions', 5)
        
        if not topic.strip():
            return jsonify({'error': 'Topic cannot be empty'}), 400
        
        ai_service = current_app.ai_service
        quiz = ai_service.generate_quiz(topic, content, difficulty, num_questions)
        
        return jsonify({'quiz': quiz})
        
    except Exception as e:
        logger.error(f"Error generating quiz: {e}")
        return jsonify({'error': f'Quiz generation failed: {str(e)}'}), 500

@ai_chat_bp.route('/create-study-plan', methods=['POST'])
def create_ai_study_plan():
    """Create study plan using AI"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get parameters
        subjects = data.get('subjects', [])
        available_hours = data.get('availableHours', 4)
        learning_pace = data.get('learningPace', 45)
        
        if not subjects:
            return jsonify({'error': 'At least one subject is required'}), 400
        
        # Get deadlines from assignments
        assignments = storage.get_assignments()
        deadlines = []
        for assignment in assignments:
            if assignment.status != 'completed':
                deadlines.append({
                    'title': assignment.title,
                    'type': assignment.type,
                    'deadline': assignment.deadline.strftime('%Y-%m-%d')
                })
        
        ai_service = current_app.ai_service
        study_plan = ai_service.create_study_plan(
            subjects=subjects,
            available_hours=available_hours,
            learning_pace=learning_pace,
            deadlines=deadlines
        )
        
        return jsonify({'studyPlan': study_plan})
        
    except Exception as e:
        logger.error(f"Error creating AI study plan: {e}")
        return jsonify({'error': f'Study plan creation failed: {str(e)}'}), 500

@ai_chat_bp.route('/motivation', methods=['GET'])
def get_motivation():
    """Get motivational message based on current progress"""
    try:
        # Get user progress
        user = storage.get_user_by_username("mitchell")
        units = storage.get_units()
        
        study_streak = user.study_streak if user else 0
        completed_topics = sum(unit.completed_topics for unit in units)
        total_topics = sum(unit.total_topics for unit in units)
        
        ai_service = current_app.ai_service
        motivation = ai_service.provide_motivation(study_streak, completed_topics, total_topics)
        
        return jsonify({
            'motivation': motivation,
            'studyStreak': study_streak,
            'progress': {
                'completed': completed_topics,
                'total': total_topics,
                'percentage': round((completed_topics / total_topics * 100) if total_topics > 0 else 0, 1)
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting motivation: {e}")
        return jsonify({'error': f'Motivation generation failed: {str(e)}'}), 500

@ai_chat_bp.route('/break-suggestion', methods=['POST'])
def get_break_suggestion():
    """Get break activity suggestion"""
    try:
        data = request.get_json()
        study_duration = data.get('studyDuration', 60) if data else 60
        
        ai_service = current_app.ai_service
        suggestion = ai_service.suggest_break_activity(study_duration)
        
        return jsonify({'suggestion': suggestion})
        
    except Exception as e:
        logger.error(f"Error getting break suggestion: {e}")
        return jsonify({'error': f'Break suggestion failed: {str(e)}'}), 500

@ai_chat_bp.route('/explain', methods=['POST'])
def explain_concept():
    """Explain a concept in simple terms"""
    try:
        data = request.get_json()
        if not data or 'concept' not in data:
            return jsonify({'error': 'Concept is required'}), 400
        
        concept = data['concept']
        context = data.get('context', '')
        
        if not concept.strip():
            return jsonify({'error': 'Concept cannot be empty'}), 400
        
        ai_service = current_app.ai_service
        explanation = ai_service.explain_concept(concept, context)
        
        return jsonify({'explanation': explanation})
        
    except Exception as e:
        logger.error(f"Error explaining concept: {e}")
        return jsonify({'error': f'Concept explanation failed: {str(e)}'}), 500

@ai_chat_bp.route('/chats', methods=['GET'])
def get_chat_history():
    """Get chat history"""
    try:
        chats = storage.get_ai_chats()
        
        chats_list = []
        for chat in chats:
            chat_dict = {
                'id': chat.id,
                'sessionId': chat.session_id,
                'messageCount': len(chat.messages),
                'lastMessage': chat.messages[-1] if chat.messages else None,
                'createdAt': chat.created_at.isoformat(),
                'updatedAt': chat.updated_at.isoformat()
            }
            chats_list.append(chat_dict)
        
        # Sort by most recent first
        chats_list.sort(key=lambda c: c['updatedAt'], reverse=True)
        
        return jsonify(chats_list)
        
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        return jsonify({'error': 'Failed to retrieve chat history'}), 500

@ai_chat_bp.route('/chats/<session_id>', methods=['GET'])
def get_chat_session(session_id):
    """Get specific chat session"""
    try:
        chat = storage.get_ai_chat_by_session(session_id)
        if not chat:
            return jsonify({'error': 'Chat session not found'}), 404
        
        chat_dict = {
            'id': chat.id,
            'messages': chat.messages,
            'sessionId': chat.session_id,
            'createdAt': chat.created_at.isoformat(),
            'updatedAt': chat.updated_at.isoformat()
        }
        
        return jsonify(chat_dict)
        
    except Exception as e:
        logger.error(f"Error getting chat session {session_id}: {e}")
        return jsonify({'error': 'Failed to retrieve chat session'}), 500
