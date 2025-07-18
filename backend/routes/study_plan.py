from flask import Blueprint, request, jsonify, current_app
import logging
from datetime import datetime, date
from models import storage

study_plan_bp = Blueprint('study_plan', __name__)
logger = logging.getLogger(__name__)

@study_plan_bp.route('', methods=['GET'])
def get_study_plans():
    """Get study plans, optionally filtered by date"""
    try:
        date_param = request.args.get('date')
        
        if date_param:
            # Get plan for specific date
            try:
                target_date = datetime.fromisoformat(date_param.replace('Z', '+00:00'))
            except ValueError:
                target_date = datetime.strptime(date_param, '%Y-%m-%d')
            
            plan = storage.get_study_plan_by_date(target_date)
            if plan:
                plan_dict = {
                    'id': plan.id,
                    'date': plan.date.isoformat(),
                    'scheduledTopics': plan.scheduled_topics,
                    'completedTopics': plan.completed_topics,
                    'totalStudyTime': plan.total_study_time,
                    'actualStudyTime': plan.actual_study_time,
                    'breaks': plan.breaks,
                    'createdAt': plan.created_at.isoformat()
                }
                return jsonify(plan_dict)
            else:
                return jsonify(None), 200
        else:
            # Get all plans
            plans = storage.get_study_plans()
            plans_list = []
            for plan in plans:
                plan_dict = {
                    'id': plan.id,
                    'date': plan.date.isoformat(),
                    'scheduledTopics': plan.scheduled_topics,
                    'completedTopics': plan.completed_topics,
                    'totalStudyTime': plan.total_study_time,
                    'actualStudyTime': plan.actual_study_time,
                    'breaks': plan.breaks,
                    'createdAt': plan.created_at.isoformat()
                }
                plans_list.append(plan_dict)
            
            return jsonify(plans_list)
    except Exception as e:
        logger.error(f"Error getting study plans: {e}")
        return jsonify({'error': 'Failed to retrieve study plans'}), 500

@study_plan_bp.route('', methods=['POST'])
def create_study_plan():
    """Create a new study plan"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Parse date if provided as string
        if 'date' in data and isinstance(data['date'], str):
            try:
                data['date'] = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
            except ValueError:
                data['date'] = datetime.strptime(data['date'], '%Y-%m-%d')
        
        plan = storage.create_study_plan(**data)
        
        plan_dict = {
            'id': plan.id,
            'date': plan.date.isoformat(),
            'scheduledTopics': plan.scheduled_topics,
            'completedTopics': plan.completed_topics,
            'totalStudyTime': plan.total_study_time,
            'actualStudyTime': plan.actual_study_time,
            'breaks': plan.breaks,
            'createdAt': plan.created_at.isoformat()
        }
        
        return jsonify(plan_dict), 201
    except Exception as e:
        logger.error(f"Error creating study plan: {e}")
        return jsonify({'error': 'Failed to create study plan'}), 500

@study_plan_bp.route('/generate', methods=['POST'])
def generate_study_plan():
    """Generate a study plan using AI and study planner service"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get parameters
        target_date = data.get('date', datetime.now())
        if isinstance(target_date, str):
            try:
                target_date = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
            except ValueError:
                target_date = datetime.strptime(target_date, '%Y-%m-%d')
        
        learning_pace = data.get('learningPace', 45)
        available_hours = data.get('availableHours', 4)
        
        # Get units and assignments
        units = storage.get_units()
        assignments = storage.get_assignments()
        
        # Generate plan using study planner service
        study_planner = current_app.study_planner
        plan_data = study_planner.generate_daily_plan(
            date=target_date,
            units=units,
            assignments=assignments,
            learning_pace=learning_pace,
            available_hours=available_hours
        )
        
        # Check if plan already exists for this date
        existing_plan = storage.get_study_plan_by_date(target_date)
        if existing_plan:
            # Update existing plan
            plan = storage.update_study_plan(existing_plan.id, **plan_data)
        else:
            # Create new plan
            plan = storage.create_study_plan(**plan_data)
        
        plan_dict = {
            'id': plan.id,
            'date': plan.date.isoformat(),
            'scheduledTopics': plan.scheduled_topics,
            'completedTopics': plan.completed_topics,
            'totalStudyTime': plan.total_study_time,
            'actualStudyTime': plan.actual_study_time,
            'breaks': plan.breaks,
            'createdAt': plan.created_at.isoformat()
        }
        
        return jsonify(plan_dict), 201
    except Exception as e:
        logger.error(f"Error generating study plan: {e}")
        return jsonify({'error': 'Failed to generate study plan'}), 500

@study_plan_bp.route('/<int:plan_id>', methods=['PATCH'])
def update_study_plan(plan_id):
    """Update a study plan"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Parse date if provided as string
        if 'date' in data and isinstance(data['date'], str):
            try:
                data['date'] = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
            except ValueError:
                data['date'] = datetime.strptime(data['date'], '%Y-%m-%d')
        
        plan = storage.update_study_plan(plan_id, **data)
        if not plan:
            return jsonify({'error': 'Study plan not found'}), 404
        
        plan_dict = {
            'id': plan.id,
            'date': plan.date.isoformat(),
            'scheduledTopics': plan.scheduled_topics,
            'completedTopics': plan.completed_topics,
            'totalStudyTime': plan.total_study_time,
            'actualStudyTime': plan.actual_study_time,
            'breaks': plan.breaks,
            'createdAt': plan.created_at.isoformat()
        }
        
        return jsonify(plan_dict)
    except Exception as e:
        logger.error(f"Error updating study plan {plan_id}: {e}")
        return jsonify({'error': 'Failed to update study plan'}), 500

@study_plan_bp.route('/<int:plan_id>/complete-topic', methods=['POST'])
def complete_topic(plan_id):
    """Mark a topic as completed in a study plan"""
    try:
        data = request.get_json()
        if not data or 'topicIndex' not in data:
            return jsonify({'error': 'Topic index is required'}), 400
        
        topic_index = data['topicIndex']
        actual_time = data.get('actualTime', 0)
        
        plan = storage.get_study_plan_by_date(datetime.now())  # Get today's plan
        if not plan:
            return jsonify({'error': 'Study plan not found'}), 404
        
        # Update topic completion
        scheduled_topics = plan.scheduled_topics or []
        completed_topics = plan.completed_topics or []
        
        if 0 <= topic_index < len(scheduled_topics):
            topic = scheduled_topics[topic_index].copy()
            topic['completed'] = True
            topic['actualTime'] = actual_time
            
            completed_topics.append(topic)
            
            # Update plan
            new_actual_time = plan.actual_study_time + actual_time
            plan = storage.update_study_plan(
                plan.id,
                completed_topics=completed_topics,
                actual_study_time=new_actual_time
            )
            
            plan_dict = {
                'id': plan.id,
                'date': plan.date.isoformat(),
                'scheduledTopics': plan.scheduled_topics,
                'completedTopics': plan.completed_topics,
                'totalStudyTime': plan.total_study_time,
                'actualStudyTime': plan.actual_study_time,
                'breaks': plan.breaks,
                'createdAt': plan.created_at.isoformat()
            }
            
            return jsonify(plan_dict)
        else:
            return jsonify({'error': 'Invalid topic index'}), 400
            
    except Exception as e:
        logger.error(f"Error completing topic in plan {plan_id}: {e}")
        return jsonify({'error': 'Failed to complete topic'}), 500

@study_plan_bp.route('/today/suggestions', methods=['GET'])
def get_plan_suggestions():
    """Get suggestions for adjusting today's study plan"""
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        plan = storage.get_study_plan_by_date(today)
        
        if not plan:
            return jsonify({'message': 'No study plan found for today'})
        
        # Calculate remaining time and incomplete topics
        remaining_time = plan.total_study_time - plan.actual_study_time
        completed_topics = plan.completed_topics or []
        scheduled_topics = plan.scheduled_topics or []
        
        # Use study planner to get suggestions
        study_planner = current_app.study_planner
        suggestions = study_planner.suggest_plan_adjustments(
            original_plan={
                'scheduled_topics': scheduled_topics,
                'total_study_time': plan.total_study_time
            },
            completed_topics=completed_topics,
            remaining_time=remaining_time
        )
        
        return jsonify(suggestions)
    except Exception as e:
        logger.error(f"Error getting plan suggestions: {e}")
        return jsonify({'error': 'Failed to get plan suggestions'}), 500

@study_plan_bp.route('/stats', methods=['GET'])
def get_study_stats():
    """Get study statistics"""
    try:
        plans = storage.get_study_plans()
        
        total_plans = len(plans)
        total_study_time = sum(plan.actual_study_time for plan in plans)
        total_planned_time = sum(plan.total_study_time for plan in plans)
        
        # Calculate completion rate
        if total_planned_time > 0:
            completion_rate = total_study_time / total_planned_time * 100
        else:
            completion_rate = 0
        
        # Get current week stats
        now = datetime.now()
        week_start = now - datetime.timedelta(days=now.weekday())
        week_plans = [p for p in plans if p.date >= week_start]
        week_study_time = sum(plan.actual_study_time for plan in week_plans)
        
        # Calculate study streak
        study_streak = 0
        sorted_plans = sorted(plans, key=lambda p: p.date, reverse=True)
        current_date = datetime.now().date()
        
        for plan in sorted_plans:
            if plan.date.date() == current_date and plan.actual_study_time > 0:
                study_streak += 1
                current_date -= datetime.timedelta(days=1)
            else:
                break
        
        stats = {
            'totalPlans': total_plans,
            'totalStudyTime': total_study_time,  # in minutes
            'totalPlannedTime': total_planned_time,
            'completionRate': round(completion_rate, 1),
            'weeklyStudyTime': week_study_time,
            'studyStreak': study_streak,
            'averageDailyStudy': round(total_study_time / max(total_plans, 1), 1)
        }
        
        return jsonify(stats)
    except Exception as e:
        logger.error(f"Error getting study stats: {e}")
        return jsonify({'error': 'Failed to retrieve study statistics'}), 500
