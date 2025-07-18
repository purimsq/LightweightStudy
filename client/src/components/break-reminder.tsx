import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Coffee, Clock, CheckCircle } from "lucide-react";
import { useStudySession } from "@/hooks/use-study-session";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function BreakReminder() {
  const { shouldShowBreakReminder, studyTime, takeBreak, dismissBreakReminder } = useStudySession();
  const [showReminder, setShowReminder] = useState(false);

  // Send automatic break reminder via Ollama
  const breakReminderMutation = useMutation({
    mutationFn: async (studyTime: number) => {
      const sessionId = `break_reminder_${Date.now()}`;
      const now = new Date();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      
      const message = `You've been studying for ${studyTime} minutes${isWeekend ? ' on a weekend' : ''}. Time for a break! 🌸 
      
Your well-being matters - taking breaks helps you learn better and stay focused. 

Would you like me to:
- Set a 10-minute break timer?
- Suggest some light stretches?
- Save your current progress?
- Help you plan what to study after your break?`;

      return apiRequest("POST", "/api/ai/chat", {
        message: message,
        sessionId: sessionId,
        automated: true
      });
    },
  });

  useEffect(() => {
    if (shouldShowBreakReminder && studyTime > 0) {
      setShowReminder(true);
      // Automatically send reminder via AI
      breakReminderMutation.mutate(studyTime);
    }
  }, [shouldShowBreakReminder, studyTime]);

  const handleTakeBreak = () => {
    takeBreak();
    setShowReminder(false);
  };

  const handleDismiss = () => {
    dismissBreakReminder();
    setShowReminder(false);
  };

  if (!showReminder || !shouldShowBreakReminder) {
    return null;
  }

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Alert className="border-orange-200 bg-orange-50 shadow-lg">
        <Coffee className="w-4 h-4 text-orange-600" />
        <AlertDescription>
          <div className="space-y-3">
            <div>
              <p className="font-medium text-orange-800">Time for a break! 🌸</p>
              <p className="text-orange-700 text-sm mt-1">
                You've been studying for {studyTime} minutes{isWeekend ? ' on a weekend' : ''}. 
                Taking breaks helps you learn better!
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                onClick={handleTakeBreak}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Coffee className="w-3 h-3 mr-1" />
                Take Break
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleDismiss}
                className="border-orange-300 text-orange-800 hover:bg-orange-100"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Later
              </Button>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}