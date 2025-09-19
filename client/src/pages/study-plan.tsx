import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, BookOpen, Target, ChevronRight } from "lucide-react";
import { format, startOfToday, addDays } from "date-fns";

export default function StudyPlan() {
  const today = startOfToday();
  
  const { data: todaysPlan } = useQuery({
    queryKey: ["/api/study-plans", { date: today.toISOString() }],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/study-plans?date=${today.toISOString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch study plan");
      return response.json();
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["/api/assignments"],
  });

  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  // Generate sample study plan if none exists
  const samplePlan = {
    date: today,
    scheduledTopics: [
      {
        unitId: 1,
        unitName: "Anatomy",
        topic: "Cardiovascular System",
        estimatedTime: 60,
        priority: "high",
        completed: false,
      },
      {
        unitId: 2,
        unitName: "Immunology", 
        topic: "Innate Immunity",
        estimatedTime: 45,
        priority: "medium",
        completed: false,
      },
      {
        unitId: 3,
        unitName: "Physiology",
        topic: "Cellular Respiration",
        estimatedTime: 30,
        priority: "low", 
        completed: false,
      },
    ],
    totalStudyTime: 135,
    actualStudyTime: 0,
    breaks: [],
  };

  const studyPlan = todaysPlan || samplePlan;
  const upcomingAssignments = assignments
    .filter((a: any) => new Date(a.deadline) > today)
    .sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700";
      case "medium":
        return "bg-yellow-100 text-yellow-700";
      case "low":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const completedTopics = studyPlan.scheduledTopics?.filter((t: any) => t.completed).length || 0;
  const totalTopics = studyPlan.scheduledTopics?.length || 0;
  const progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Daily Study Plan</h1>
            <p className="text-neutral-600 mt-1">
              {format(today, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <Target className="w-4 h-4 mr-2" />
            Generate New Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Progress */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <BookOpen className="w-5 h-5 mr-2 text-primary" />
                Today's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Topics Completed</span>
                  <span>{completedTopics} of {totalTopics}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
              <div className="flex items-center text-sm text-neutral-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>{studyPlan.actualStudyTime} of {studyPlan.totalStudyTime} minutes</span>
              </div>
            </CardContent>
          </Card>

          {/* Study Streak */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Target className="w-5 h-5 mr-2 text-accent" />
                Study Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">7</div>
              <p className="text-sm text-neutral-600">days in a row</p>
              <p className="text-xs text-neutral-500 mt-1">Keep it up!</p>
            </CardContent>
          </Card>

          {/* Time Allocation */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Time Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Study Time</span>
                <span>{studyPlan.totalStudyTime} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Break Time</span>
                <span>20 min</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Total</span>
                <span>{studyPlan.totalStudyTime + 20} min</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scheduled Topics */}
          <div>
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">Scheduled Topics</h2>
            <div className="space-y-3">
              {studyPlan.scheduledTopics?.map((topic: any, index: number) => (
                <Card key={index} className="transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {topic.unitName}
                          </Badge>
                          <Badge className={`text-xs ${getPriorityColor(topic.priority)}`}>
                            {topic.priority}
                          </Badge>
                        </div>
                        <h3 className="font-medium text-neutral-800">{topic.topic}</h3>
                        <div className="flex items-center text-sm text-neutral-600 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {topic.estimatedTime} minutes
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {topic.completed ? (
                          <Badge className="bg-green-100 text-green-700">
                            ✓ Completed
                          </Badge>
                        ) : (
                          <Button size="sm" variant="outline">
                            Start
                          </Button>
                        )}
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div>
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">Upcoming Deadlines</h2>
            <div className="space-y-3">
              {upcomingAssignments.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Calendar className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
                    <p className="text-neutral-600">No upcoming deadlines</p>
                  </CardContent>
                </Card>
              ) : (
                upcomingAssignments.map((assignment: any) => {
                  const daysUntil = Math.ceil(
                    (new Date(assignment.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  
                  return (
                    <Card key={assignment.id} className="transition-all duration-200 hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant={assignment.type === "cat" ? "destructive" : "secondary"}>
                                {assignment.type.toUpperCase()}
                              </Badge>
                              {daysUntil <= 3 && (
                                <Badge variant="destructive" className="text-xs">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium text-neutral-800">{assignment.title}</h3>
                            <p className="text-sm text-neutral-600">
                              Due {format(new Date(assignment.deadline), "MMM d")} 
                              ({daysUntil} days)
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-neutral-400" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Weekly Overview */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">This Week</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = addDays(today, i);
                    const isToday = i === 0;
                    
                    return (
                      <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        isToday ? "bg-primary/10 border border-primary/20" : "hover:bg-neutral-50"
                      }`}>
                        <div className="flex items-center space-x-3">
                          <div className={`w-2 h-2 rounded-full ${
                            isToday ? "bg-primary" : "bg-neutral-300"
                          }`} />
                          <span className={`text-sm ${
                            isToday ? "font-medium text-primary" : "text-neutral-600"
                          }`}>
                            {format(date, "EEE, MMM d")}
                          </span>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {isToday ? "Today" : "Planned"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
