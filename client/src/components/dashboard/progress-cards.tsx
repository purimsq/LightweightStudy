import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart3, Flame, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function ProgressCards() {
  const [, navigate] = useLocation();
  
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  // Calculate today's progress
  const totalTopics = units.reduce((sum: number, unit: any) => sum + unit.totalTopics, 0);
  const completedTopics = units.reduce((sum: number, unit: any) => sum + unit.completedTopics, 0);
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Today's Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-gray">Today's Progress</h3>
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm text-neutral-600 mb-1">
              <span>Completed Topics</span>
              <span>{completedTopics} of {totalTopics}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
          <p className="text-sm text-neutral-600">
            {progressPercentage > 50 ? "Great progress today!" : "Keep going! You're doing great."}
          </p>
        </CardContent>
      </Card>

      {/* Study Streak */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-gray">Study Streak</h3>
            <Flame className="w-5 h-5 text-accent" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-accent mb-2">
              {user?.studyStreak || 0}
            </div>
            <p className="text-sm text-neutral-600">days in a row</p>
            <p className="text-xs text-neutral-600 mt-1">
              {user?.studyStreak > 0 ? "Amazing consistency!" : "Start your streak today!"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Up Next */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-warm-gray">Up Next</h3>
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm text-neutral-600 text-center">No sessions scheduled</p>
            <Button
              onClick={() => navigate("/study-plan")}
              className="w-full mt-3 bg-primary hover:bg-primary/90"
              size="sm"
            >
              Create Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
