import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, X, BarChart3, Info, CheckCircle2, Circle, BookOpen, Clock, Target } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useMemo, useEffect } from "react";
import * as React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Tooltip, Legend, AreaChart, Area } from "recharts";
import { format, subDays, startOfWeek, addDays, differenceInDays } from "date-fns";
import type { UnitProgress, Unit, Assignment } from "@shared/schema";

interface ProgressData {
  units: Array<{
    unit: Unit;
    progress: UnitProgress;
    chartData: Array<{ month: string; value: number }>;
  }>;
  assignments: Array<{
    assignment: Assignment;
    daysUntilDeadline: number;
    completionPercentage: number;
  }>;
  overallStats: {
    totalUnits: number;
    completedUnits: number;
    totalAssignments: number;
    completedAssignments: number;
    averageProgress: number;
    weeklyImprovement: number;
  };
  studyCalendar: Array<{
    date: string;
    intensity: number; // 0-4
  }>;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-gray-400" />;
}

function UnitChart({ unitData }: { unitData: ProgressData['units'][0] }) {
  const { unit, progress, chartData } = unitData;
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full bg-${unit.color}-500`}></div>
          <h4 className="font-medium text-sm text-gray-800">{unit.name}</h4>
        </div>
        <Badge variant="outline" className="text-xs">
          {unit.completedTopics}/{unit.totalTopics} topics
        </Badge>
      </div>
      
      <div className="h-16 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${unit.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={progress.trend === 'up' ? '#10b981' : progress.trend === 'down' ? '#ef4444' : '#6b7280'} 
                  stopOpacity={0.2}
                />
                <stop 
                  offset="95%" 
                  stopColor={progress.trend === 'up' ? '#10b981' : progress.trend === 'down' ? '#ef4444' : '#6b7280'} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
            <YAxis hide />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={progress.trend === 'up' ? '#10b981' : progress.trend === 'down' ? '#ef4444' : '#6b7280'}
              strokeWidth={1.5}
              fill={`url(#gradient-${unit.id})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-center">
        <div className="text-lg font-semibold text-gray-800">
          {progress.progressPercentage}%
        </div>
        <div className="text-xs text-gray-600">
          {progress.weeklyImprovement > 0 ? '+' : ''}{progress.weeklyImprovement} this week
        </div>
      </div>
    </div>
  );
}

function generateCalendarData() {
  const data = [];
  const today = new Date();
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  
  // Generate a 7x7 grid (49 days) starting from first of month
  for (let i = 0; i < 49; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    data.push({
      date: format(date, 'yyyy-MM-dd'),
      intensity: Math.floor(Math.random() * 5) // 0-4 intensity
    });
  }
  return data;
}

export default function ProgressPage() {
  const [, setLocation] = useLocation();

  // Fetch real data
  const { data: units = [], refetch: refetchUnits } = useQuery({
    queryKey: ["/api/units"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: unitProgress = [], refetch: refetchUnitProgress } = useQuery({
    queryKey: ["/api/unit-progress"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["/api/assignments"],
  });

  // Refetch data when component mounts to ensure we have the latest data
  React.useEffect(() => {
    refetchUnits();
    refetchUnitProgress();
  }, [refetchUnits, refetchUnitProgress]);

  // Process and combine the data
  const progressData: ProgressData = useMemo(() => {
    console.log('🔍 Debug - Units:', units);
    console.log('🔍 Debug - Unit Progress:', unitProgress);
    
    // Combine units with their progress
    const unitsWithProgress = units.map(unit => {
      const progress = unitProgress.find(p => p.unitId === unit.id);
      console.log(`🔍 Unit ${unit.id} (${unit.name}) - Progress found:`, !!progress, progress);
      
      if (!progress) {
        console.log(`❌ No progress found for unit ${unit.id} (${unit.name})`);
        // Create a default progress entry for units without progress
        const defaultProgress = {
          id: 0,
          unitId: unit.id,
          progressPercentage: 0,
          weeklyImprovement: 0,
          trend: "stable" as const,
          lastUpdated: new Date(),
          createdAt: new Date()
        };
        
        const chartData = [
          { month: "Jan", value: 0 },
          { month: "Feb", value: 0 },
          { month: "Mar", value: 0 },
          { month: "Apr", value: 0 },
          { month: "May", value: 0 },
        ];

        return { unit, progress: defaultProgress, chartData };
      }

      // Generate chart data based on progress
      const chartData = [
        { month: "Jan", value: Math.max(0, progress.progressPercentage - 30) },
        { month: "Feb", value: Math.max(0, progress.progressPercentage - 20) },
        { month: "Mar", value: Math.max(0, progress.progressPercentage - 10) },
        { month: "Apr", value: progress.progressPercentage },
        { month: "May", value: Math.min(100, progress.progressPercentage + 5) },
      ];

      return { unit, progress, chartData };
    }).filter(Boolean) as ProgressData['units'];
    
    console.log('🔍 Final units with progress:', unitsWithProgress);
    console.log('🔍 Total units found:', units.length);
    console.log('🔍 Units with progress:', unitsWithProgress.length);
    console.log('🔍 Unit names:', unitsWithProgress.map(u => u.unit.name));

    // Process assignments
    const processedAssignments = assignments.map(assignment => {
      const daysUntilDeadline = differenceInDays(new Date(assignment.deadline), new Date());
      const completionPercentage = assignment.status === 'completed' ? 100 : 
                                  assignment.status === 'in_progress' ? 50 : 0;
      
      return {
        assignment,
        daysUntilDeadline,
        completionPercentage
      };
    });

    // Calculate overall stats
    const totalUnits = units.length;
    const completedUnits = units.filter(unit => 
      unit.completedTopics === unit.totalTopics && unit.totalTopics > 0
    ).length;
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const averageProgress = unitProgress.length > 0 
      ? unitProgress.reduce((sum, p) => sum + p.progressPercentage, 0) / unitProgress.length 
      : 0;
    const weeklyImprovement = unitProgress.length > 0
      ? unitProgress.reduce((sum, p) => sum + p.weeklyImprovement, 0) / unitProgress.length
      : 0;

    return {
      units: unitsWithProgress,
      assignments: processedAssignments,
      overallStats: {
        totalUnits,
        completedUnits,
        totalAssignments,
        completedAssignments,
        averageProgress: Math.round(averageProgress),
        weeklyImprovement: Math.round(weeklyImprovement)
      },
      studyCalendar: generateCalendarData()
    };
  }, [units, unitProgress, assignments]);

  if (!units.length) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
              <p className="text-gray-600">Track your learning journey</p>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Units Created Yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first unit to start tracking your progress.
              </p>
              <Button onClick={() => setLocation("/units")}>
                Create Your First Unit
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Progress Overview</h1>
              <p className="text-gray-600">Track your learning journey across all units</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                refetchUnits();
                refetchUnitProgress();
              }}
              className="ml-4"
            >
              🔄 Refresh
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Overall</span>
              <div className="w-16 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full" 
                  style={{ width: `${progressData.overallStats.averageProgress}%` }}
                />
              </div>
              <span className="text-sm font-medium">{progressData.overallStats.averageProgress}%</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
              <span className="text-lg">📚</span>
            </div>
          </div>
        </div>

        {/* Unit Charts Grid */}
        {progressData.units.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {progressData.units.map((unitData) => (
              <UnitChart key={unitData.unit.id} unitData={unitData} />
            ))}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Unit Stats */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Unit Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">Total Units</span>
                    </div>
                    <span className="font-medium">{progressData.overallStats.totalUnits}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Completed Units</span>
                    </div>
                    <span className="font-medium">{progressData.overallStats.completedUnits}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Average Progress</span>
                    </div>
                    <span className="font-medium">{progressData.overallStats.averageProgress}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Weekly Improvement</span>
                    </div>
                    <span className="font-medium">
                      {progressData.overallStats.weeklyImprovement > 0 ? '+' : ''}
                      {progressData.overallStats.weeklyImprovement}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress Distribution */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Progress Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Completed', value: progressData.overallStats.completedUnits },
                          { name: 'In Progress', value: progressData.overallStats.totalUnits - progressData.overallStats.completedUnits }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#3b82f6" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-xs">Completed</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-xs">In Progress</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Assignments */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                {progressData.assignments.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No assignments yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {progressData.assignments.slice(0, 5).map((assignmentData) => (
                      <div key={assignmentData.assignment.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">{assignmentData.assignment.title}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600">{assignmentData.completionPercentage}%</span>
                            <Badge 
                              variant={assignmentData.daysUntilDeadline < 0 ? "destructive" : 
                                      assignmentData.daysUntilDeadline < 3 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {assignmentData.daysUntilDeadline < 0 ? 'Overdue' : 
                               assignmentData.daysUntilDeadline === 0 ? 'Due today' :
                               `${assignmentData.daysUntilDeadline}d left`}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={assignmentData.completionPercentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-800 mb-2">
                    Weekly Progress Overview
                  </p>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { name: 'Mon', value: progressData.overallStats.averageProgress - 10 },
                        { name: 'Tue', value: progressData.overallStats.averageProgress - 5 },
                        { name: 'Wed', value: progressData.overallStats.averageProgress },
                        { name: 'Thu', value: progressData.overallStats.averageProgress + 2 },
                        { name: 'Fri', value: progressData.overallStats.averageProgress + 5 },
                        { name: 'Sat', value: progressData.overallStats.averageProgress + 8 },
                        { name: 'Sun', value: progressData.overallStats.averageProgress + 10 }
                      ]}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
                        <YAxis hide />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {progressData.overallStats.weeklyImprovement > 0 ? 'Improving' : 'Needs attention'} this week
                    <span className="ml-2 text-orange-500 font-medium">
                      {progressData.overallStats.weeklyImprovement > 0 ? '+' : ''}
                      {progressData.overallStats.weeklyImprovement}%
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Study Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Study Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                    <div key={`day-${index}`} className="text-xs text-gray-500 text-center font-medium p-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {progressData.studyCalendar.slice(0, 49).map((day, index) => (
                    <div
                      key={`cal-${index}`}
                      className={`w-4 h-4 rounded-sm ${
                        day.intensity === 0 ? 'bg-gray-100' :
                        day.intensity === 1 ? 'bg-emerald-100' :
                        day.intensity === 2 ? 'bg-emerald-200' :
                        day.intensity === 3 ? 'bg-emerald-300' :
                        day.intensity === 4 ? 'bg-emerald-400' : 'bg-emerald-500'
                      }`}
                      title={`${day.date}: ${day.intensity} hours`}
                    />
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-800">
                    {progressData.overallStats.weeklyImprovement > 0 
                      ? 'Great progress! Keep up the momentum.' 
                      : 'Consider increasing study time this week.'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/units")}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Manage Units
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/assignments")}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    View Assignments
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setLocation("/documents")}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Study Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}