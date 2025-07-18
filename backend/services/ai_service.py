import logging
import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class AIService:
    """Service for interacting with local Ollama AI"""
    
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.model = "phi"
        self.system_prompt = """You are StudyCompanion, a private offline assistant for a single user. 
You must:
1. Never overwrite user summaries or notes without their approval.
2. Help generate study plans based on deadlines, topic size, and pace level.
3. Remind the user to rest when study time is excessive (especially weekends).
4. Generate summaries and quizzes upon request only.(But sometimes suggest and wait for approval or decline)
5. Match assignment/CAT questions to notes using local embedding.
6. Always be kind, encouraging, and use concise explanations.
7. Never connect to the internet, always work locally unless asked by user."""
        
        self.session_timeout = 3600  # 1 hour timeout for requests
    
    def check_connection(self) -> str:
        """Check if Ollama is running and accessible"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models = response.json()
                has_phi = any("phi" in model.get("name", "") for model in models.get("models", []))
                if has_phi:
                    return "connected_with_phi"
                else:
                    return "connected_no_phi"
            else:
                return "error"
        except requests.exceptions.RequestException as e:
            logger.warning(f"Cannot connect to Ollama: {e}")
            return "disconnected"
    
    def generate_response(self, prompt: str, context: Optional[str] = None) -> str:
        """Generate AI response using Ollama"""
        try:
            # Prepare the full prompt with system message
            full_prompt = prompt
            if context:
                full_prompt = f"Context: {context}\n\nUser: {prompt}"
            
            payload = {
                "model": self.model,
                "prompt": full_prompt,
                "system": self.system_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 1000
                }
            }
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.session_timeout,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("response", "").strip()
            else:
                error_msg = f"Ollama API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except requests.exceptions.Timeout:
            error_msg = "AI request timed out. The model might be too slow or overloaded."
            logger.error(error_msg)
            raise Exception(error_msg)
        except requests.exceptions.RequestException as e:
            error_msg = f"Failed to connect to Ollama: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"AI generation error: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    def generate_summary(self, text: str, max_length: int = 300) -> str:
        """Generate a summary of the given text"""
        prompt = f"""Please provide a concise summary of the following text in approximately {max_length} words. Focus on the main concepts, key points, and important details that a student should remember:

{text[:5000]}  # Limit input text to prevent token overflow
"""
        return self.generate_response(prompt)
    
    def generate_quiz(self, topic: str, content: str = "", difficulty: str = "medium", num_questions: int = 5) -> str:
        """Generate quiz questions for a topic"""
        prompt = f"""Generate {num_questions} {difficulty} level quiz questions about {topic}.
        
        Content to base questions on:
        {content[:3000] if content else "Use general knowledge about the topic"}
        
        Format your response as:
        1. Question 1
           a) Option A
           b) Option B
           c) Option C
           d) Option D
           Answer: X
        
        (Continue for all {num_questions} questions)
        
        Make sure the questions test understanding, not just memorization."""
        
        return self.generate_response(prompt)
    
    def find_relevant_content(self, query: str, documents: List[Dict[str, Any]]) -> str:
        """Find relevant content from documents based on query"""
        # Simple text matching for now - in a full implementation, 
        # this would use embeddings for semantic search
        relevant_docs = []
        query_lower = query.lower()
        
        for doc in documents:
            text = doc.get('extracted_text', '').lower()
            if any(word in text for word in query_lower.split()):
                relevant_docs.append({
                    'name': doc.get('original_name', 'Unknown'),
                    'text': doc.get('extracted_text', '')[:1000]  # First 1000 chars
                })
        
        if not relevant_docs:
            return "No relevant documents found for your query."
        
        context = "\n\n".join([f"From {doc['name']}:\n{doc['text']}" for doc in relevant_docs[:3]])
        
        prompt = f"""Based on the following documents, provide helpful information related to the query: "{query}"

Documents:
{context}

Please provide a comprehensive answer that helps the student understand the topic."""
        
        return self.generate_response(prompt)
    
    def create_study_plan(self, 
                         subjects: List[str], 
                         available_hours: int,
                         learning_pace: int,
                         deadlines: List[Dict[str, Any]]) -> str:
        """Create a personalized study plan"""
        
        pace_description = "slow and thorough" if learning_pace < 30 else "moderate" if learning_pace < 60 else "fast-paced"
        
        prompt = f"""Create a detailed study plan with these parameters:
        
        Subjects to study: {', '.join(subjects)}
        Available study time: {available_hours} hours per day
        Learning pace: {learning_pace}/80 ({pace_description})
        
        Upcoming deadlines:
        {chr(10).join([f"- {d.get('title', 'Assignment')} ({d.get('type', 'assignment')}) due {d.get('deadline', 'soon')}" for d in deadlines])}
        
        Please provide:
        1. Daily schedule with time blocks
        2. Priority order based on deadlines
        3. Suggested break intervals
        4. Study techniques for each subject
        5. Progress tracking recommendations
        
        Keep the plan realistic and achievable based on the learning pace."""
        
        return self.generate_response(prompt)
    
    def provide_motivation(self, study_streak: int, completed_topics: int, total_topics: int) -> str:
        """Generate motivational message based on progress"""
        progress_percent = (completed_topics / total_topics * 100) if total_topics > 0 else 0
        
        prompt = f"""Provide an encouraging and motivational message for a student with:
        - Study streak: {study_streak} days
        - Progress: {completed_topics}/{total_topics} topics completed ({progress_percent:.1f}%)
        
        Keep it personal, warm, and encouraging. Acknowledge their progress and provide gentle motivation to continue."""
        
        return self.generate_response(prompt)
    
    def suggest_break_activity(self, study_duration: int) -> str:
        """Suggest appropriate break activities based on study duration"""
        prompt = f"""The student has been studying for {study_duration} minutes. Suggest appropriate break activities that will help them refresh and return to studying effectively. Consider:
        - Physical movement
        - Mental relaxation
        - Eye rest (if using screens)
        - Hydration/nutrition
        
        Keep suggestions brief and practical."""
        
        return self.generate_response(prompt)
    
    def explain_concept(self, concept: str, context: str = "") -> str:
        """Explain a complex concept in simple terms"""
        prompt = f"""Explain the concept of "{concept}" in simple, clear terms that a student can easily understand.
        
        {f"Context: {context}" if context else ""}
        
        Please:
        1. Define the concept clearly
        2. Provide relatable examples
        3. Explain why it's important
        4. Suggest ways to remember it
        
        Use encouraging language and avoid overly technical jargon."""
        
        return self.generate_response(prompt)
