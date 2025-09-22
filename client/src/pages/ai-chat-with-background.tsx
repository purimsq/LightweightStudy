import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, Bot, User, AlertCircle, CheckCircle, Lightbulb, Shield, Zap, Coffee, ChevronDown, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { usePageState } from "@/contexts/PageStateContext";
import { useAIGeneration } from "@/hooks/use-background-tasks";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AIHealthStatus {
  status: "connected" | "disconnected" | "error";
  hasPhiModel: boolean;
  model?: string;
  version?: string;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const time = format(new Date(message.timestamp), "HH:mm");

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-blue-500" : "bg-gray-200"
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-gray-600" />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div className={`inline-block p-3 rounded-lg ${
          isUser 
            ? "bg-blue-500 text-white" 
            : "bg-gray-100 text-gray-900"
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

export default function AIChatWithBackground() {
  const [message, setMessage] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Use page state for persistence
  const { pageState, updatePageState } = usePageState('ai-chat');
  const { generateAI, getActiveTasks } = useAIGeneration('ai-chat');

  // Restore messages from page state
  const [messages, setMessages] = useState<Message[]>(pageState?.data?.messages || []);

  // Save messages to page state
  useEffect(() => {
    updatePageState({
      data: { messages },
    });
  }, [messages, updatePageState]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const { data: healthStatus, isLoading: healthLoading } = useQuery<AIHealthStatus>({
    queryKey: ["/api/ai/health"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: messageText,
          sessionId,
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      // Add AI response to messages
      const aiMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    const messageToSend = message;
    setMessage("");

    // Start AI generation in background
    generateAI(
      messageToSend,
      (result) => {
        const aiMessage: Message = {
          role: "assistant",
          content: result.response,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, aiMessage]);
      },
      (error) => {
        toast({
          title: "AI Generation Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast({
      title: "Chat Cleared",
      description: "Your conversation has been cleared.",
    });
  };

  const activeTasks = getActiveTasks();
  const hasActiveGeneration = activeTasks.some(task => task.type === 'ai_generation');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">AI Study Companion</h1>
              <div className="flex items-center gap-2">
                {healthLoading ? (
                  <Badge variant="outline">Checking...</Badge>
                ) : healthStatus?.status === "connected" ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Offline
                  </Badge>
                )}
                {hasActiveGeneration && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    <Clock className="w-3 h-3 mr-1" />
                    Generating...
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={clearChat}>
                Clear Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Alert */}
        {healthStatus?.status === "disconnected" && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              AI is currently offline. Some features may not be available.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
              <p className="text-gray-500 mb-6">Ask me anything about your studies, documents, or assignments.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => setMessage("Help me create a study plan for my upcoming exams")}
                >
                  <Lightbulb className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">Study Planning</div>
                    <div className="text-sm text-gray-500">Create personalized study schedules</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => setMessage("Summarize my uploaded documents")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">Document Analysis</div>
                    <div className="text-sm text-gray-500">Get insights from your materials</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => setMessage("Generate practice questions from my notes")}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">Quiz Generation</div>
                    <div className="text-sm text-gray-500">Create practice tests</div>
                  </div>
                </Button>
                
                <Button
                  variant="outline"
                  className="h-auto p-4 text-left justify-start"
                  onClick={() => setMessage("Help me understand this concept better")}
                >
                  <Coffee className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">Concept Explanation</div>
                    <div className="text-sm text-gray-500">Get detailed explanations</div>
                  </div>
                </Button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))
          )}
          
          {hasActiveGeneration && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="inline-block p-3 rounded-lg bg-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0 p-6 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your studies..."
            disabled={hasActiveGeneration}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || hasActiveGeneration}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
