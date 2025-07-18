import logging
from datetime import datetime, timedelta, time
from typing import List, Dict, Any, Optional
from models import Assignment, Unit, StudyPlan

logger = logging.getLogger(__name__)

class StudyPlanner:
    """Service for generating and managing study plans"""
    
    def __init__(self):
        self.default_study_session = 45  # minutes
        self.default_break_duration = 15  # minutes
        self.max_daily_study_hours = 8
        self.weekend_reduction_factor = 0.7  # Reduce weekend study by 30%
    
    def generate_daily_plan(self, 
                           date: datetime,
                           units: List[Unit],
                           assignments: List[Assignment],
                           learning_pace: int = 45,
                           available_hours: int = 4) -> Dict[str, Any]:
        """Generate a study plan for a specific day"""
        
        try:
            # Adjust study time based on learning pace (1-80 scale)
            pace_multiplier = learning_pace / 50.0  # Normalize around 1.0
            effective_hours = min(available_hours * pace_multiplier, self.max_daily_study_hours)
            
            # Reduce study time on weekends
            if date.weekday() >= 5:  # Saturday = 5, Sunday = 6
                effective_hours *= self.weekend_reduction_factor
            
            # Get urgent assignments (due within 7 days)
            urgent_assignments = self._get_urgent_assignments(assignments, date)
            
            # Prioritize topics based on deadlines and unit progress
            prioritized_topics = self._prioritize_topics(units, urgent_assignments, learning_pace)
            
            # Allocate time slots
            time_slots = self._allocate_time_slots(prioritized_topics, effective_hours)
            
            # Generate break schedule
            breaks = self._generate_break_schedule(effective_hours)
            
            plan = {
                'date': date,
                'scheduled_topics': time_slots,
                'completed_topics': [],
                'total_study_time': int(effective_hours * 60),  # Convert to minutes
                'actual_study_time': 0,
                'breaks': breaks,
                'urgent_assignments': [self._assignment_to_dict(a) for a in urgent_assignments],
                'learning_pace': learning_pace,
                'effective_hours': effective_hours
            }
            
            logger.info(f"Generated study plan for {date.date()} with {len(time_slots)} topics")
            return plan
            
        except Exception as e:
            logger.error(f"Error generating study plan: {e}")
            raise Exception(f"Failed to generate study plan: {str(e)}")
    
    def _get_urgent_assignments(self, assignments: List[Assignment], current_date: datetime) -> List[Assignment]:
        """Get assignments due within the next 7 days"""
        urgent_deadline = current_date + timedelta(days=7)
        urgent = []
        
        for assignment in assignments:
            if (assignment.status != 'completed' and 
                assignment.deadline <= urgent_deadline and 
                assignment.deadline >= current_date):
                urgent.append(assignment)
        
        # Sort by deadline (most urgent first)
        urgent.sort(key=lambda a: a.deadline)
        return urgent
    
    def _prioritize_topics(self, units: List[Unit], urgent_assignments: List[Assignment], learning_pace: int) -> List[Dict[str, Any]]:
        """Prioritize study topics based on various factors"""
        topics = []
        
        # Create topics from urgent assignments
        for assignment in urgent_assignments:
            days_until_due = (assignment.deadline - datetime.now()).days
            urgency = "high" if days_until_due <= 2 else "medium" if days_until_due <= 5 else "low"
            
            topics.append({
                'type': 'assignment',
                'title': f"Work on {assignment.title}",
                'assignment_id': assignment.id,
                'unit_name': assignment.type.upper(),
                'estimated_time': self._estimate_assignment_time(assignment, learning_pace),
                'priority': urgency,
                'deadline': assignment.deadline,
                'completed': False
            })
        
        # Add regular study topics from units
        for unit in units:
            if unit.completed_topics < unit.total_topics:
                remaining_topics = unit.total_topics - unit.completed_topics
                
                # Generate topics for incomplete units
                for i in range(min(remaining_topics, 2)):  # Max 2 topics per unit per day
                    topic_name = self._generate_topic_name(unit, unit.completed_topics + i + 1)
                    
                    topics.append({
                        'type': 'study',
                        'title': topic_name,
                        'unit_id': unit.id,
                        'unit_name': unit.name,
                        'estimated_time': self._estimate_study_time(learning_pace),
                        'priority': self._calculate_priority(unit),
                        'deadline': None,
                        'completed': False
                    })
        
        # Sort by priority and deadline
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        topics.sort(key=lambda t: (
            priority_order.get(t['priority'], 3),
            t['deadline'] if t['deadline'] else datetime.max
        ))
        
        return topics
    
    def _allocate_time_slots(self, topics: List[Dict[str, Any]], available_hours: float) -> List[Dict[str, Any]]:
        """Allocate time slots for topics within available hours"""
        available_minutes = int(available_hours * 60)
        allocated_topics = []
        total_allocated = 0
        
        for topic in topics:
            if total_allocated + topic['estimated_time'] <= available_minutes:
                allocated_topics.append(topic)
                total_allocated += topic['estimated_time']
            else:
                # Try to fit a shorter version of the topic
                remaining_time = available_minutes - total_allocated
                if remaining_time >= 20:  # Minimum 20 minutes
                    topic['estimated_time'] = remaining_time
                    allocated_topics.append(topic)
                    break
                else:
                    break
        
        return allocated_topics
    
    def _generate_break_schedule(self, study_hours: float) -> List[Dict[str, Any]]:
        """Generate appropriate break schedule"""
        breaks = []
        study_minutes = int(study_hours * 60)
        
        # Add breaks every 45-60 minutes of study
        break_interval = 50  # minutes
        current_time = break_interval
        
        while current_time < study_minutes:
            break_duration = self.default_break_duration
            
            # Longer break after 2+ hours
            if current_time >= 120:
                break_duration = 30
            
            breaks.append({
                'time': current_time,
                'duration': break_duration,
                'type': 'study_break',
                'suggestion': self._get_break_suggestion(current_time)
            })
            
            current_time += break_interval + break_duration
        
        return breaks
    
    def _estimate_assignment_time(self, assignment: Assignment, learning_pace: int) -> int:
        """Estimate time needed for an assignment based on type and pace"""
        base_time = 60  # 1 hour base
        
        if assignment.type == 'cat':
            base_time = 90  # CATs typically need more prep
        
        # Adjust based on learning pace
        pace_factor = 80 / learning_pace  # Slower pace = more time needed
        estimated_time = int(base_time * pace_factor)
        
        return max(30, min(estimated_time, 180))  # Between 30 and 180 minutes
    
    def _estimate_study_time(self, learning_pace: int) -> int:
        """Estimate time for regular study topics"""
        base_time = self.default_study_session
        pace_factor = 80 / learning_pace
        
        estimated_time = int(base_time * pace_factor)
        return max(20, min(estimated_time, 90))  # Between 20 and 90 minutes
    
    def _generate_topic_name(self, unit: Unit, topic_number: int) -> str:
        """Generate a topic name for a unit"""
        topic_templates = {
            'anatomy': [
                'Cardiovascular System', 'Respiratory System', 'Nervous System',
                'Muscular System', 'Skeletal System', 'Digestive System'
            ],
            'immunology': [
                'Innate Immunity', 'Adaptive Immunity', 'Antibodies',
                'T-Cell Functions', 'Immune Responses', 'Autoimmunity'
            ],
            'physiology': [
                'Cellular Respiration', 'Homeostasis', 'Metabolism',
                'Endocrine System', 'Neural Transmission', 'Blood Circulation'
            ]
        }
        
        unit_name_lower = unit.name.lower()
        if unit_name_lower in topic_templates:
            topics = topic_templates[unit_name_lower]
            if topic_number <= len(topics):
                return topics[topic_number - 1]
        
        return f"{unit.name} - Topic {topic_number}"
    
    def _calculate_priority(self, unit: Unit) -> str:
        """Calculate priority level for a unit"""
        completion_rate = unit.completed_topics / unit.total_topics if unit.total_topics > 0 else 0
        
        if completion_rate < 0.3:
            return "high"
        elif completion_rate < 0.7:
            return "medium"
        else:
            return "low"
    
    def _get_break_suggestion(self, study_time: int) -> str:
        """Get break activity suggestion based on study duration"""
        if study_time <= 60:
            return "Take a short walk or stretch"
        elif study_time <= 120:
            return "Get some fresh air and hydrate"
        else:
            return "Take a longer break - eat something, walk outside, or rest your eyes"
    
    def _assignment_to_dict(self, assignment: Assignment) -> Dict[str, Any]:
        """Convert assignment object to dictionary"""
        return {
            'id': assignment.id,
            'title': assignment.title,
            'type': assignment.type,
            'deadline': assignment.deadline.isoformat(),
            'status': assignment.status,
            'days_until_due': (assignment.deadline - datetime.now()).days
        }
    
    def update_progress(self, plan_id: int, topic_index: int, completed: bool, actual_time: int = 0) -> bool:
        """Update progress for a specific topic in a study plan"""
        try:
            # This would update the actual study plan in the database
            # For now, just log the progress
            logger.info(f"Progress update - Plan: {plan_id}, Topic: {topic_index}, Completed: {completed}, Time: {actual_time}min")
            return True
        except Exception as e:
            logger.error(f"Error updating progress: {e}")
            return False
    
    def suggest_plan_adjustments(self, 
                                original_plan: Dict[str, Any], 
                                completed_topics: List[Dict[str, Any]], 
                                remaining_time: int) -> Dict[str, Any]:
        """Suggest adjustments to study plan based on progress"""
        try:
            incomplete_topics = [
                topic for topic in original_plan['scheduled_topics'] 
                if not any(ct['title'] == topic['title'] for ct in completed_topics)
            ]
            
            if not incomplete_topics:
                return {'message': 'Great job! All topics completed.', 'adjustments': []}
            
            suggestions = []
            
            if remaining_time > 60:  # More than 1 hour left
                suggestions.append({
                    'type': 'continue',
                    'message': f"You have {remaining_time} minutes left. Consider working on: {incomplete_topics[0]['title']}"
                })
            elif remaining_time > 20:  # 20-60 minutes left
                suggestions.append({
                    'type': 'review',
                    'message': f"Perfect time for a quick review of today's completed topics."
                })
            else:  # Less than 20 minutes
                suggestions.append({
                    'type': 'wrap_up',
                    'message': "Good stopping point! Plan these topics for tomorrow.",
                    'postponed_topics': [topic['title'] for topic in incomplete_topics[:2]]
                })
            
            return {
                'incomplete_topics': len(incomplete_topics),
                'suggestions': suggestions,
                'remaining_time': remaining_time
            }
            
        except Exception as e:
            logger.error(f"Error suggesting plan adjustments: {e}")
            return {'error': str(e)}
