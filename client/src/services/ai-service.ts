import { apiRequest } from "@/lib/queryClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  chat: {
    id: number;
    messages: ChatMessage[];
    sessionId: string;
  };
}

export interface AIHealthStatus {
  status: "connected" | "disconnected" | "error";
  hasPhiModel: boolean;
  message: string;
}

export class AIService {
  private static instance: AIService;
  private baseUrl = "/api/ai";

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async sendMessage(message: string, sessionId: string): Promise<ChatResponse> {
    try {
      const response = await apiRequest("POST", `${this.baseUrl}/chat`, {
        message,
        sessionId,
      });
      return await response.json();
    } catch (error) {
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async checkHealth(): Promise<AIHealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return {
        status: "disconnected",
        hasPhiModel: false,
        message: `Cannot connect to AI service: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  async generateSummary(text: string): Promise<string> {
    const summaryPrompt = `Please provide a concise summary of the following text. Focus on the key concepts and main points:\n\n${text}`;
    
    try {
      const sessionId = `summary_${Date.now()}`;
      const response = await this.sendMessage(summaryPrompt, sessionId);
      return response.response;
    } catch (error) {
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async generateQuiz(topic: string, difficulty: "easy" | "medium" | "hard" = "medium"): Promise<string> {
    const quizPrompt = `Generate 5 ${difficulty} level quiz questions about ${topic}. Include multiple choice questions with answers. Format the output clearly with questions numbered 1-5.`;
    
    try {
      const sessionId = `quiz_${Date.now()}`;
      const response = await this.sendMessage(quizPrompt, sessionId);
      return response.response;
    } catch (error) {
      throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async findRelevantNotes(query: string): Promise<string> {
    const searchPrompt = `Based on the query "${query}", help identify what topics and materials would be most relevant for studying. Provide specific guidance on what to focus on.`;
    
    try {
      const sessionId = `search_${Date.now()}`;
      const response = await this.sendMessage(searchPrompt, sessionId);
      return response.response;
    } catch (error) {
      throw new Error(`Failed to find relevant notes: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async createStudyPlan(
    subjects: string[],
    timeAvailable: number,
    learningPace: number,
    deadlines: Array<{ subject: string; date: string }>
  ): Promise<string> {
    const planPrompt = `Create a study plan with these parameters:
- Subjects: ${subjects.join(", ")}
- Time available: ${timeAvailable} hours per day
- Learning pace: ${learningPace}/80 (1=slow, 80=fast)
- Upcoming deadlines: ${deadlines.map(d => `${d.subject} due ${d.date}`).join(", ")}

Please provide a detailed daily study schedule prioritizing subjects with closer deadlines.`;
    
    try {
      const sessionId = `study_plan_${Date.now()}`;
      const response = await this.sendMessage(planPrompt, sessionId);
      return response.response;
    } catch (error) {
      throw new Error(`Failed to create study plan: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

export const aiService = AIService.getInstance();
