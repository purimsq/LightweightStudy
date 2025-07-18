import os
import logging
import PyPDF2
import docx
from typing import Optional, Dict, Any
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Service for processing uploaded documents and extracting text"""
    
    def __init__(self):
        self.supported_extensions = {'.pdf', '.docx', '.doc'}
        self.max_text_length = 50000  # Limit extracted text length
    
    def is_supported_file(self, filename: str) -> bool:
        """Check if file type is supported"""
        _, ext = os.path.splitext(filename.lower())
        return ext in self.supported_extensions
    
    def save_file(self, file, upload_folder: str) -> str:
        """Save uploaded file to disk and return the file path"""
        if not file or not file.filename:
            raise ValueError("No file provided")
        
        if not self.is_supported_file(file.filename):
            raise ValueError(f"Unsupported file type. Supported types: {', '.join(self.supported_extensions)}")
        
        # Secure the filename
        filename = secure_filename(file.filename)
        if not filename:
            raise ValueError("Invalid filename")
        
        # Create unique filename if file already exists
        file_path = os.path.join(upload_folder, filename)
        counter = 1
        while os.path.exists(file_path):
            name, ext = os.path.splitext(filename)
            new_filename = f"{name}_{counter}{ext}"
            file_path = os.path.join(upload_folder, new_filename)
            counter += 1
        
        try:
            file.save(file_path)
            logger.info(f"File saved: {file_path}")
            return file_path
        except Exception as e:
            logger.error(f"Error saving file {filename}: {e}")
            raise ValueError(f"Failed to save file: {str(e)}")
    
    def extract_text_from_file(self, file_path: str) -> str:
        """Extract text content from a document file"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        _, ext = os.path.splitext(file_path.lower())
        
        try:
            if ext == '.pdf':
                return self._extract_from_pdf(file_path)
            elif ext in ['.docx', '.doc']:
                return self._extract_from_docx(file_path)
            else:
                raise ValueError(f"Unsupported file extension: {ext}")
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {e}")
            raise ValueError(f"Failed to extract text: {str(e)}")
    
    def _extract_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF file"""
        text = ""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    page_text = page.extract_text()
                    text += page_text + "\n"
                    
                    # Limit text length to prevent memory issues
                    if len(text) > self.max_text_length:
                        text = text[:self.max_text_length] + "\n[Text truncated due to length limit]"
                        break
                
        except Exception as e:
            logger.error(f"Error reading PDF {file_path}: {e}")
            raise ValueError(f"Failed to read PDF file: {str(e)}")
        
        return text.strip()
    
    def _extract_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file"""
        text = ""
        try:
            doc = docx.Document(file_path)
            
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
                
                # Limit text length to prevent memory issues
                if len(text) > self.max_text_length:
                    text = text[:self.max_text_length] + "\n[Text truncated due to length limit]"
                    break
                    
        except Exception as e:
            logger.error(f"Error reading DOCX {file_path}: {e}")
            raise ValueError(f"Failed to read DOCX file: {str(e)}")
        
        return text.strip()
    
    def process_document(self, file, upload_folder: str, unit_id: Optional[int] = None) -> Dict[str, Any]:
        """Process uploaded document: save file and extract text"""
        try:
            # Save the file
            file_path = self.save_file(file, upload_folder)
            
            # Extract text content
            extracted_text = self.extract_text_from_file(file_path)
            
            return {
                'filename': os.path.basename(file_path),
                'original_name': file.filename,
                'file_type': file.content_type,
                'file_path': file_path,
                'extracted_text': extracted_text,
                'unit_id': unit_id,
                'text_length': len(extracted_text),
                'status': 'success'
            }
            
        except Exception as e:
            logger.error(f"Error processing document: {e}")
            return {
                'filename': file.filename if file else 'unknown',
                'status': 'error',
                'error': str(e)
            }
    
    def delete_file(self, file_path: str) -> bool:
        """Delete a file from disk"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"File deleted: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False
    
    def get_file_info(self, file_path: str) -> Dict[str, Any]:
        """Get information about a file"""
        try:
            if not os.path.exists(file_path):
                return {'exists': False}
            
            stat = os.stat(file_path)
            return {
                'exists': True,
                'size': stat.st_size,
                'modified': stat.st_mtime,
                'filename': os.path.basename(file_path)
            }
        except Exception as e:
            logger.error(f"Error getting file info for {file_path}: {e}")
            return {'exists': False, 'error': str(e)}
