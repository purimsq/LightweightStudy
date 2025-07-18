import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Bot, User, AlertCircle, CheckCircle, Lightbulb, Shield, Zap, Coffee } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-primary text-white" : "bg-accent/20 text-accent"
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`flex-1 max-w-md ${isUser ? "text-right" : ""}`}>
        <div className={`inline-block p-3 rounded-lg ${
          isUser 
            ? "bg-primary text-white rounded-br-sm" 
            : "bg-white border border-neutral-200 rounded-bl-sm shadow-sm"
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          {format(new Date(message.timestamp), "h:mm a")}
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
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-neutral-600 flex items-center">
        <Lightbulb className="w-4 h-4 mr-2" />
        Ask StudyCompanion (Full App Access)
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {prompts.map((prompt, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="text-left justify-start h-auto p-3 text-xs whitespace-normal"
            onClick={() => onPromptClick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: aiHealth } = useQuery({
    queryKey: ["/api/ai/health"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/ai/chat", {
        message,
        sessionId,
      });
      return response.json();
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
                  <p className="text-sm text-orange-700 mt-1">
                    Make sure Ollama is running with the phi model. Run: <code className="bg-orange-100 px-1 rounded">ollama pull phi</code>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
          {/* Chat Area */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col max-h-[500px]">
              <CardHeader className="border-b py-2">
                <CardTitle className="flex items-center text-base">
                  <Bot className="w-4 h-4 mr-2 text-emerald-600" />
                  StudyCompanion Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <ScrollArea className="flex-1 p-3 max-h-[300px]">
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center py-6">
                        <Bot className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                        <h3 className="text-base font-medium text-neutral-600 mb-1">
                          Ready to help with your studies!
                        </h3>
                        <p className="text-neutral-500 text-xs max-w-sm mx-auto">
                          I have full access to your app and can help with documents, notes, quizzes, and more.
                        </p>
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

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Prompts */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <QuickPrompts onPromptClick={handleSendMessage} />
              </CardContent>
            </Card>

            {/* Break Reminder Status */}
            <Card className="bg-emerald-50 border-emerald-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center text-emerald-800">
                  <Coffee className="w-4 h-4 mr-2" />
                  Break Reminders
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xs text-emerald-700 space-y-1">
                  <div className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Active & Automatic
                  </div>
                  <div>Every 45 min (weekdays)</div>
                  <div>Every 90 min (weekends)</div>
                  <div className="text-emerald-600 font-medium mt-2">
                    ✨ Ollama will remind you!
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Capabilities */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Full App Access</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-xs text-neutral-600">
                  <div>• All documents & notes</div>
                  <div>• Quiz & summary generation</div>
                  <div>• Study plan creation</div>
                  <div>• Assignment management</div>
                  <div>• Break reminders & wellness</div>
                  <div>• Complete app control</div>
                  <div className="text-emerald-600 font-medium mt-2">
                    Will ask approval for changes
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
