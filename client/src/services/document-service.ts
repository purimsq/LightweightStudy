import { apiRequest } from "@/lib/queryClient";
import type { Document, InsertDocument } from "@shared/schema";

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  error?: string;
}

export class DocumentService {
  private static instance: DocumentService;
  private baseUrl = "/api/documents";

  static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  async uploadDocuments(
    files: File[],
    unitId: number,
    onProgress?: (progress: UploadProgress[]) => void
  ): Promise<Document[]> {
    const uploadResults: Document[] = [];
    const progressMap = new Map<string, UploadProgress>();

    // Initialize progress tracking
    files.forEach(file => {
      progressMap.set(file.name, {
        fileName: file.name,
        progress: 0,
        status: "uploading",
      });
    });

    try {
      for (const file of files) {
        try {
          // Update progress
          progressMap.set(file.name, {
            ...progressMap.get(file.name)!,
            progress: 25,
            status: "uploading",
          });
          onProgress?.(Array.from(progressMap.values()));

          // Simulate file upload and text extraction
          const extractedText = await this.extractTextFromFile(file);
          
          // Update progress
          progressMap.set(file.name, {
            ...progressMap.get(file.name)!,
            progress: 75,
            status: "processing",
          });
          onProgress?.(Array.from(progressMap.values()));

          // Create document record
          const documentData: InsertDocument = {
            unitId,
            filename: file.name,
            originalName: file.name,
            fileType: file.type,
            filePath: `/uploads/${file.name}`,
            extractedText,
            summary: null,
            embeddings: null,
          };

          const response = await apiRequest("POST", this.baseUrl, documentData);
          const document = await response.json();
          uploadResults.push(document);

          // Update progress - completed
          progressMap.set(file.name, {
            ...progressMap.get(file.name)!,
            progress: 100,
            status: "completed",
          });
          onProgress?.(Array.from(progressMap.values()));

        } catch (error) {
          // Update progress - error
          progressMap.set(file.name, {
            ...progressMap.get(file.name)!,
            progress: 0,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
          onProgress?.(Array.from(progressMap.values()));
        }
      }

      return uploadResults;
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private async extractTextFromFile(file: File): Promise<string> {
    // In a real implementation, this would extract text from PDF/DOCX files
    // For now, return a sample extraction based on file type
    if (file.type === "application/pdf") {
      return `Extracted text content from PDF: ${file.name}\n\nThis would contain the actual extracted text from the PDF document, including all paragraphs, headings, and readable content.`;
    } else if (file.type.includes("word")) {
      return `Extracted text content from Word document: ${file.name}\n\nThis would contain the actual extracted text from the Word document, preserving formatting and structure where possible.`;
    }
    
    return `Extracted content from ${file.name}`;
  }

  async getDocuments(unitId?: number): Promise<Document[]> {
    try {
      const url = unitId ? `${this.baseUrl}?unitId=${unitId}` : this.baseUrl;
      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch documents");
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to get documents: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async deleteDocument(id: number): Promise<void> {
    try {
      await apiRequest("DELETE", `${this.baseUrl}/${id}`);
    } catch (error) {
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async generateSummary(documentId: number): Promise<string> {
    try {
      const response = await apiRequest("POST", `${this.baseUrl}/${documentId}/summary`);
      const result = await response.json();
      return result.summary;
    } catch (error) {
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  validateFile(file: File): { isValid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "File size must be less than 10MB",
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "Only PDF and Word documents are supported",
      };
    }

    return { isValid: true };
  }
}

export const documentService = DocumentService.getInstance();
