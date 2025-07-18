import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { BarChart3, Flame, Clock, FileText, Calendar } from "lucide-react";
import { useLocation } from "wouter";

export default function ProgressCards() {
  const [, navigate] = useLocation();
  
  const { data: user } = useQuery({
    queryKey: ["/api/users/current"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["/api/documents"],
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["/api/assignments"],
  });

  // Calculate today's progress
  const totalTopics = units.reduce((sum: number, unit: any) => sum + unit.totalTopics, 0);
  const completedTopics = units.reduce((sum: number, unit: any) => sum + unit.completedTopics, 0);
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // Calculate real-time stats
  const completedAssignments = assignments.filter(a => a.status === 'completed').length;
  const assignmentProgress = assignments.length > 0 ? Math.round((completedAssignments / assignments.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {/* Today's Progress */}
      <div className="floating-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-800">Topics Progress</h3>
          <div className="glass-card p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
            <span>Completed Topics</span>
            <span>{completedTopics} of {totalTopics}</span>
          </div>
          <div className="unit-progress-bar">
            <div className="unit-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
        <p className="text-sm text-neutral-600">
          {progressPercentage > 50 ? "Great progress!" : "Keep studying!"}
        </p>
      </div>

      {/* Study Streak */}
      <div className="floating-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-800">Study Streak</h3>
          <div className="glass-card p-2 rounded-lg">
            <Flame className="w-5 h-5 text-accent" />
          </div>
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
      </div>

      {/* Documents */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-800">Documents</h3>
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-neutral-800 mb-2">
              {documents.length}
            </div>
            <p className="text-sm text-neutral-600">uploaded</p>
            <p className="text-xs text-neutral-600 mt-1">
              {documents.length > 0 ? "Ready to study!" : "Upload some documents"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-800">Assignments</h3>
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm text-neutral-600 mb-1">
              <span>Completed</span>
              <span>{completedAssignments} of {assignments.length}</span>
            </div>
            <Progress value={assignmentProgress} className="h-2" />
          </div>
          <p className="text-sm text-neutral-600">
            {assignmentProgress === 100 ? "All done!" : assignments.length > 0 ? "Keep going!" : "Add assignments"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
