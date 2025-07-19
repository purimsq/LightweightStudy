import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Send, Bot, User, AlertCircle, CheckCircle, Lightbulb, Shield, Zap, Coffee, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-3xl px-4 py-3 rounded-lg ${
        isUser 
          ? "bg-blue-500 text-white" 
          : "bg-neutral-100 text-neutral-800"
      }`}>
        <div className="flex items-center mb-1">
          {isUser ? (
            <User className="w-4 h-4 mr-2" />
          ) : (
            <Bot className="w-4 h-4 mr-2" />
          )}
          <span className="text-xs opacity-75">{time}</span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
      </div>
    </div>
  );
}

function QuickPrompts({ onPromptClick }: { onPromptClick: (prompt: string) => void }) {
  const prompts = [
    "Show me all my documents and notes",
    "Create a study plan for my immunology unit",
    "Generate a comprehensive quiz on cardiovascular system", 
    "Summarize the document I just uploaded",
    "Help me organize my assignments and deadlines",
    "Create notes for my anatomy documents",
    "What should I study next based on my progress?",
    "Set up break reminders for my study session",
    "Generate practice questions for my upcoming CAT",
    "Help me track my study time and goals"
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center">
          <Lightbulb className="w-4 h-4 mr-2" />
          Quick Actions
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {prompts.map((prompt, index) => (
          <DropdownMenuItem
            key={index}
            onClick={() => onPromptClick(prompt)}
            className="p-3 text-sm whitespace-normal h-auto"
          >
            {prompt}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check AI service health
  const { data: aiHealth } = useQuery<AIHealthStatus>({
    queryKey: ["/api/ai/health"],
    refetchInterval: 30000,
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      return response;
    },
    onSuccess: (data) => {
      const aiMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    },
    onError: (error) => {
      toast({
        title: "AI Assistant Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    const userMessage: Message = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    chatMutation.mutate(text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isConnected = aiHealth?.status === "connected";
  const hasPhiModel = aiHealth?.hasPhiModel;

  return (
    <div className="p-6 h-full">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800 flex items-center">
              <Bot className="w-8 h-8 mr-3 text-emerald-600" />
              AI Study Companion
              <Badge variant="secondary" className="ml-3 bg-emerald-100 text-emerald-800">
                <Zap className="w-3 h-3 mr-1" />
                Full Access
              </Badge>
            </h1>
            <p className="text-neutral-600 mt-1">
              Your personal offline study assistant with complete access to your entire app
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className={isConnected ? "bg-green-100 text-green-700" : ""}
            >
              {isConnected ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <AlertCircle className="w-3 h-3 mr-1" />
              )}
              {isConnected ? "AI Connected" : "AI Disconnected"}
            </Badge>
            {isConnected && !hasPhiModel && (
              <Badge variant="destructive" className="text-xs">
                Phi model not found
              </Badge>
            )}
          </div>
        </div>

        {/* Full Access Notice */}
        {isConnected && (
          <Alert className="border-emerald-200 bg-emerald-50 mb-6">
            <Shield className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              <strong>Full App Access:</strong> I can access and control everything in your StudyCompanion app - 
              documents, notes, quizzes, summaries, study plans, and more. I will always ask for your approval before making any changes.
            </AlertDescription>
          </Alert>
        )}

        {/* Connection Warning */}
        {!isConnected && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2 text-orange-800">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">AI Assistant Unavailable</p>
                  <div className="text-sm text-orange-700 mt-1 space-y-2">
                    <div><strong>Status:</strong> Testing connection to your computer...</div>
                    <div><strong>Step 1:</strong> <code className="bg-orange-100 px-1 rounded text-xs">set OLLAMA_HOST=0.0.0.0:11434 && ollama serve</code></div>
                    <div><strong>Step 2:</strong> <code className="bg-orange-100 px-1 rounded text-xs">ollama pull phi</code></div>
                    <div className="text-xs text-orange-600">
                      <strong>Note:</strong> If still not connecting, the Replit environment might not be able to reach your local machine. 
                      This is normal due to network restrictions.
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full Width Chat Area */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-lg">
                <Bot className="w-5 h-5 mr-2 text-emerald-600" />
                StudyCompanion Chat
              </CardTitle>
              <QuickPrompts onPromptClick={handleSendMessage} />
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                    <h3 className="text-lg font-medium text-neutral-600 mb-2">
                      Ready to help with your studies!
                    </h3>
                    <p className="text-neutral-500 max-w-md mx-auto">
                      I have full access to your app and can help with documents, notes, quizzes, 
                      summaries, study plans, and more. I'll ask for approval before making changes.
                    </p>
                    <div className="mt-6 flex items-center justify-center space-x-4 text-sm text-emerald-600">
                      <div className="flex items-center">
                        <Coffee className="w-4 h-4 mr-1" />
                        Auto break reminders
                      </div>
                      <div className="flex items-center">
                        <Shield className="w-4 h-4 mr-1" />
                        Full app access
                      </div>
                    </div>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <MessageBubble key={index} message={message} />
                  ))
                )}
                {chatMutation.isPending && (
                  <div className="flex items-center space-x-2 text-neutral-500">
                    <Bot className="w-4 h-4" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4">
              <div className="flex space-x-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isConnected ? "Ask me anything about your studies..." : "AI assistant is offline"}
                  disabled={chatMutation.isPending || !isConnected}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || chatMutation.isPending || !isConnected}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}