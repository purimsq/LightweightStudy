from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List, Dict, Any
import json

@dataclass
class User:
    id: int
    username: str
    name: str
    learning_pace: int = 45
    study_streak: int = 0
    last_active_date: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Unit:
    id: int
    name: str
    description: Optional[str] = None
    color: str = "blue"
    icon: str = "folder"
    total_topics: int = 0
    completed_topics: int = 0
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class Document:
    id: int
    unit_id: Optional[int] = None
    filename: str = ""
    original_name: str = ""
    file_type: str = ""
    file_path: str = ""
    extracted_text: Optional[str] = None
    summary: Optional[str] = None
    embeddings: Optional[Dict[str, Any]] = None
    uploaded_at: datetime = field(default_factory=datetime.now)

@dataclass
class Note:
    id: int
    document_id: Optional[int] = None
    content: str = ""
    is_markdown: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class Assignment:
    id: int
    title: str
    description: Optional[str] = None
    type: str = "assignment"  # assignment or cat
    deadline: datetime = field(default_factory=datetime.now)
    status: str = "pending"  # pending, in_progress, completed
    questions: Optional[List[Dict[str, Any]]] = None
    related_documents: Optional[List[int]] = None
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class StudyPlan:
    id: int
    date: datetime
    scheduled_topics: Optional[List[Dict[str, Any]]] = None
    completed_topics: Optional[List[Dict[str, Any]]] = None
    total_study_time: int = 0  # in minutes
    actual_study_time: int = 0
    breaks: Optional[List[Dict[str, Any]]] = None
    created_at: datetime = field(default_factory=datetime.now)

@dataclass
class AiChat:
    id: int
    messages: List[Dict[str, Any]] = field(default_factory=list)
    session_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

class InMemoryStorage:
    """Simple in-memory storage for the application data"""
    
    def __init__(self):
        self.users: Dict[int, User] = {}
        self.units: Dict[int, Unit] = {}
        self.documents: Dict[int, Document] = {}
        self.notes: Dict[int, Note] = {}
        self.assignments: Dict[int, Assignment] = {}
        self.study_plans: Dict[int, StudyPlan] = {}
        self.ai_chats: Dict[int, AiChat] = {}
        self.current_id = 1
        
        # Initialize with sample data
        self._initialize_sample_data()
    
    def _get_next_id(self) -> int:
        id_val = self.current_id
        self.current_id += 1
        return id_val
    
    def _initialize_sample_data(self):
        """Initialize with sample user and units"""
        # Create default user
        user = User(
            id=self._get_next_id(),
            username="mitchell",
            name="Mitchell",
            learning_pace=45,
            study_streak=0
        )
        self.users[user.id] = user
        
        # Create sample units
        units_data = [
            {"name": "Anatomy", "description": "Human body systems and structures", "color": "green", "icon": "user-md", "total_topics": 5, "completed_topics": 3},
            {"name": "Immunology", "description": "Immune system and defense mechanisms", "color": "yellow", "icon": "shield-alt", "total_topics": 5, "completed_topics": 1},
            {"name": "Physiology", "description": "Body functions and processes", "color": "blue", "icon": "heartbeat", "total_topics": 5, "completed_topics": 2}
        ]
        
        for unit_data in units_data:
            unit = Unit(id=self._get_next_id(), **unit_data)
            self.units[unit.id] = unit
    
    # User methods
    def get_user(self, id: int) -> Optional[User]:
        return self.users.get(id)
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        for user in self.users.values():
            if user.username == username:
                return user
        return None
    
    def create_user(self, **kwargs) -> User:
        user = User(id=self._get_next_id(), **kwargs)
        self.users[user.id] = user
        return user
    
    def update_user(self, id: int, **kwargs) -> Optional[User]:
        if id in self.users:
            user = self.users[id]
            for key, value in kwargs.items():
                if hasattr(user, key):
                    setattr(user, key, value)
            return user
        return None
    
    # Unit methods
    def get_units(self) -> List[Unit]:
        return list(self.units.values())
    
    def get_unit(self, id: int) -> Optional[Unit]:
        return self.units.get(id)
    
    def create_unit(self, **kwargs) -> Unit:
        unit = Unit(id=self._get_next_id(), **kwargs)
        self.units[unit.id] = unit
        return unit
    
    def update_unit(self, id: int, **kwargs) -> Optional[Unit]:
        if id in self.units:
            unit = self.units[id]
            for key, value in kwargs.items():
                if hasattr(unit, key):
                    setattr(unit, key, value)
            return unit
        return None
    
    def delete_unit(self, id: int) -> bool:
        if id in self.units:
            del self.units[id]
            # Also delete related documents
            docs_to_delete = [doc_id for doc_id, doc in self.documents.items() if doc.unit_id == id]
            for doc_id in docs_to_delete:
                del self.documents[doc_id]
            return True
        return False
    
    # Document methods
    def get_documents(self, unit_id: Optional[int] = None) -> List[Document]:
        docs = list(self.documents.values())
        if unit_id is not None:
            docs = [doc for doc in docs if doc.unit_id == unit_id]
        return docs
    
    def get_document(self, id: int) -> Optional[Document]:
        return self.documents.get(id)
    
    def create_document(self, **kwargs) -> Document:
        document = Document(id=self._get_next_id(), **kwargs)
        self.documents[document.id] = document
        return document
    
    def update_document(self, id: int, **kwargs) -> Optional[Document]:
        if id in self.documents:
            document = self.documents[id]
            for key, value in kwargs.items():
                if hasattr(document, key):
                    setattr(document, key, value)
            return document
        return None
    
    def delete_document(self, id: int) -> bool:
        if id in self.documents:
            del self.documents[id]
            # Also delete related notes
            notes_to_delete = [note_id for note_id, note in self.notes.items() if note.document_id == id]
            for note_id in notes_to_delete:
                del self.notes[note_id]
            return True
        return False
    
    # Note methods
    def get_notes(self, document_id: Optional[int] = None) -> List[Note]:
        notes = list(self.notes.values())
        if document_id is not None:
            notes = [note for note in notes if note.document_id == document_id]
        return notes
    
    def get_note(self, id: int) -> Optional[Note]:
        return self.notes.get(id)
    
    def create_note(self, **kwargs) -> Note:
        note = Note(id=self._get_next_id(), **kwargs)
        self.notes[note.id] = note
        return note
    
    def update_note(self, id: int, **kwargs) -> Optional[Note]:
        if id in self.notes:
            note = self.notes[id]
            for key, value in kwargs.items():
                if hasattr(note, key):
                    setattr(note, key, value)
            note.updated_at = datetime.now()
            return note
        return None
    
    def delete_note(self, id: int) -> bool:
        return self.notes.pop(id, None) is not None
    
    # Assignment methods
    def get_assignments(self) -> List[Assignment]:
        return list(self.assignments.values())
    
    def get_assignment(self, id: int) -> Optional[Assignment]:
        return self.assignments.get(id)
    
    def create_assignment(self, **kwargs) -> Assignment:
        assignment = Assignment(id=self._get_next_id(), **kwargs)
        self.assignments[assignment.id] = assignment
        return assignment
    
    def update_assignment(self, id: int, **kwargs) -> Optional[Assignment]:
        if id in self.assignments:
            assignment = self.assignments[id]
            for key, value in kwargs.items():
                if hasattr(assignment, key):
                    setattr(assignment, key, value)
            return assignment
        return None
    
    def delete_assignment(self, id: int) -> bool:
        return self.assignments.pop(id, None) is not None
    
    # Study plan methods
    def get_study_plans(self) -> List[StudyPlan]:
        return list(self.study_plans.values())
    
    def get_study_plan_by_date(self, date: datetime) -> Optional[StudyPlan]:
        date_str = date.date()
        for plan in self.study_plans.values():
            if plan.date.date() == date_str:
                return plan
        return None
    
    def create_study_plan(self, **kwargs) -> StudyPlan:
        plan = StudyPlan(id=self._get_next_id(), **kwargs)
        self.study_plans[plan.id] = plan
        return plan
    
    def update_study_plan(self, id: int, **kwargs) -> Optional[StudyPlan]:
        if id in self.study_plans:
            plan = self.study_plans[id]
            for key, value in kwargs.items():
                if hasattr(plan, key):
                    setattr(plan, key, value)
            return plan
        return None
    
    # AI Chat methods
    def get_ai_chats(self) -> List[AiChat]:
        return list(self.ai_chats.values())
    
    def get_ai_chat_by_session(self, session_id: str) -> Optional[AiChat]:
        for chat in self.ai_chats.values():
            if chat.session_id == session_id:
                return chat
        return None
    
    def create_ai_chat(self, **kwargs) -> AiChat:
        chat = AiChat(id=self._get_next_id(), **kwargs)
        self.ai_chats[chat.id] = chat
        return chat
    
    def update_ai_chat(self, id: int, **kwargs) -> Optional[AiChat]:
        if id in self.ai_chats:
            chat = self.ai_chats[id]
            for key, value in kwargs.items():
                if hasattr(chat, key):
                    setattr(chat, key, value)
            chat.updated_at = datetime.now()
            return chat
        return None

# Global storage instance
storage = InMemoryStorage()
