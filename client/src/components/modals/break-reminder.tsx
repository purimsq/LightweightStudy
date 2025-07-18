import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coffee, X } from "lucide-react";
import { useStudySession } from "@/hooks/use-study-session";

export default function BreakReminder() {
  const [isVisible, setIsVisible] = useState(false);
  const { studyTime, takeBreak, dismissBreakReminder } = useStudySession();

  useEffect(() => {
    // Show break reminder every 2 hours (120 minutes)
    if (studyTime >= 120 && studyTime % 120 === 0) {
      setIsVisible(true);
    }
  }, [studyTime]);

  const handleTakeBreak = () => {
    takeBreak();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    dismissBreakReminder();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in">
      <Card className="max-w-sm shadow-xl border border-neutral-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Coffee className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-neutral-800 mb-1">Time for a break!</h4>
              <p className="text-sm text-neutral-600 mb-3">
                You've been studying for {Math.floor(studyTime / 60)} hours. 
                Take a 15-minute break to stay fresh.
              </p>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleTakeBreak}
                  className="bg-accent hover:bg-accent/90 text-white"
                >
                  Take Break
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-neutral-600 hover:text-neutral-800"
                >
                  Later
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
