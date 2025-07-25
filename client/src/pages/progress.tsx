import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, X, BarChart3, Info, CheckCircle2, Circle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Tooltip, Legend, AreaChart, Area } from "recharts";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import type { UnitProgress, Unit } from "@shared/schema";

interface ProgressData {
  subjects: Array<{
    name: string;
    currentWeek: number;
    trend: 'up' | 'down' | 'stable';
    chartData: Array<{ month: string; value: number }>;
  }>;
  assessments: Array<{
    subject: string;
    zScore: number;
    classAvg: number;
    classRank: string;
    trend: 'up' | 'down' | 'stable';
  }>;
  cognitiveLoad: {
    reading: number;
    clinical: number;
    other: number;
  };
  assignments: Array<{
    name: string;
    completion: number;
    timeSpent: string;
    trend: 'up' | 'down';
  }>;
  weeklyImprovement: number;
  overallProgress: number;
  finalGradeProjection: number;
  notes: Array<{
    task: string;
    completed: boolean;
  }>;
  studyCalendar: Array<{
    date: string;
    intensity: number; // 0-4
  }>;
}

// Data matching the image exactly
const progressData: ProgressData = {
  subjects: [
    {
      name: "Anatomy",
      currentWeek: 3,
      trend: "up",
      chartData: [
        { month: "Feb", value: 20 },
        { month: "Mar", value: 35 },
        { month: "Apr", value: 45 },
        { month: "May", value: 65 },
        { month: "Jul", value: 78 }
      ]
    },
    {
      name: "Physiology", 
      currentWeek: -4,
      trend: "down",
      chartData: [
        { month: "Jan", value: 25 },
        { month: "Feb", value: 40 },
        { month: "Apr", value: 55 },
        { month: "Mar", value: 45 },
        { month: "Jul", value: 60 }
      ]
    },
    {
      name: "Pharmacology",
      currentWeek: -2,
      trend: "down", 
      chartData: [
        { month: "Apr", value: 30 },
        { month: "Lot", value: 45 },
        { month: "A7", value: 50 }
      ]
    },
    {
      name: "Pathology",
      currentWeek: 5,
      trend: "up",
      chartData: [
        { month: "May", value: 35 },
        { month: "Mar", value: 45 },
        { month: "Apr", value: 60 },
        { month: "May", value: 70 },
        { month: "Jun", value: 75 }
      ]
    },
    {
      name: "Biochem", 
      currentWeek: 0,
      trend: "stable",
      chartData: [
        { month: "Apr", value: 40 },
        { month: "Ob", value: 45 },
        { month: "Abc", value: 50 },
        { month: "May", value: 52 },
        { month: "Dec", value: 55 }
      ]
    }
  ],
  assessments: [
    { subject: "Anatomy", zScore: 48, classAvg: 78, classRank: "8th", trend: "up" },
    { subject: "Respiratory Jelal Exam", zScore: 46, classAvg: 43, classRank: "3rd", trend: "up" },
    { subject: "Cardio Exam", zScore: 46, classAvg: 25, classRank: "8th", trend: "up" },
    { subject: "Pathology Exam", zScore: 52, classAvg: 29, classRank: "8th", trend: "up" },
    { subject: "Microbio Exam", zScore: 56, classAvg: 30, classRank: "8th", trend: "up" },
    { subject: "Biochem", zScore: 46, classAvg: 36, classRank: "6th", trend: "up" }
  ],
  cognitiveLoad: {
    reading: 40,
    clinical: 35,
    other: 25
  },
  assignments: [
    { name: "Mucito Load", completion: 52, timeSpent: "min Sc", trend: "up" },
    { name: "Clinical Rounds", completion: 28, timeSpent: "6hr", trend: "up" },
    { name: "Pathology", completion: 25, timeSpent: "4 min", trend: "up" },
    { name: "Microbio", completion: 66, timeSpent: "", trend: "up" }
  ],
  weeklyImprovement: 4,
  overallProgress: 76,
  finalGradeProjection: 78,
  notes: [
    { task: "Revise Neuroanatomy", completed: true },
    { task: "Submit Patho lab notes", completed: false },
    { task: "Review antibiotics", completed: false }
  ],
  studyCalendar: generateCalendarData()
};

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

const COGNITIVE_COLORS = ['#10b981', '#f59e0b', '#ef4444'];

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-gray-400" />;
}

function SubjectChart({ subject }: { subject: ProgressData['subjects'][0] }) {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm text-gray-800">{subject.name}</h4>
      </div>
      
      <div className="h-16 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={subject.chartData}>
            <defs>
              <linearGradient id={`gradient-${subject.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={subject.trend === 'up' ? '#10b981' : subject.trend === 'down' ? '#ef4444' : '#6b7280'} 
                  stopOpacity={0.2}
                />
                <stop 
                  offset="95%" 
                  stopColor={subject.trend === 'up' ? '#10b981' : subject.trend === 'down' ? '#ef4444' : '#6b7280'} 
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
            <YAxis hide />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={subject.trend === 'up' ? '#10b981' : subject.trend === 'down' ? '#ef4444' : '#6b7280'}
              strokeWidth={1.5}
              fill={`url(#gradient-${subject.name})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-center">
        <div className="text-lg font-semibold text-gray-800">
          {subject.currentWeek > 0 ? '+' : ''}{subject.currentWeek} this week
        </div>
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [, setLocation] = useLocation();

  const data = progressData;

  // Query for units to integrate with real data if needed
  const { data: units } = useQuery({
    queryKey: ["/api/units"],
  });

  const { data: unitProgress } = useQuery({
    queryKey: ["/api/unit-progress"],
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header matching the image */}
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
              <h1 className="text-3xl font-bold text-gray-900">Mitch's Progress</h1>
              <p className="text-gray-600">Clinical Med 1.2</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Overall</span>
              <div className="w-16 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full" 
                  style={{ width: `${data.overallProgress}%` }}
                />
              </div>
              <span className="text-sm font-medium">{data.overallProgress}%</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-pink-200 flex items-center justify-center">
              <span className="text-lg">👩</span>
            </div>
          </div>
        </div>

        {/* Subject Charts Grid - matching the image layout */}
        <div className="grid grid-cols-5 gap-4">
          {data.subjects.map((subject, index) => (
            <SubjectChart key={`subject-${index}`} subject={subject} />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Assessments */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 mb-2">
                    <div></div>
                    <div className="text-center">Z-Score</div>
                    <div className="text-center">Class Avg</div>
                    <div className="text-center">Trend</div>
                  </div>
                  {data.assessments.map((assessment, index) => (
                    <div key={`assessment-${index}`} className="grid grid-cols-4 gap-2 py-1 text-sm">
                      <div className="font-medium text-gray-800">{assessment.subject}</div>
                      <div className="text-center">{assessment.zScore}%</div>
                      <div className="text-center">{assessment.classAvg}%</div>
                      <div className="flex justify-center">
                        <TrendIcon trend={assessment.trend} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cognitive Load Breakdown */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Cognitive Load Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                      <span className="text-sm">Reading Load</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-sm">Clinical Rounds</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-32 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Reading', value: data.cognitiveLoad.reading },
                          { name: 'Clinical', value: data.cognitiveLoad.clinical },
                          { name: 'Other', value: data.cognitiveLoad.other }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COGNITIVE_COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
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
                <div className="space-y-4">
                  {data.assignments.map((assignment, index) => (
                    <div key={`assignment-${index}`} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{assignment.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-600">{assignment.completion}%</span>
                          <span className="text-xs text-gray-600">{assignment.timeSpent}</span>
                          <TrendIcon trend={assignment.trend} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* You improved section */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-800 mb-2">
                    You improved in 4 of 6 subjects this week!
                  </p>
                  <div className="h-24">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { name: 'Feb', value: 50 },
                        { name: 'Mar', value: 55 },
                        { name: 'Apr', value: 60 },
                        { name: 'May', value: 65 },
                        { name: 'Jul', value: 70 },
                        { name: 'Sat', value: 75 },
                        { name: 'Jul', value: 78 }
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
                    On track for a {data.finalGradeProjection}% final grade
                    <span className="ml-2 text-orange-500 font-medium">{data.finalGradeProjection}%</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Notes and Calendar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.notes.map((note, index) => (
                    <div key={`note-${index}`} className="flex items-center space-x-3">
                      {note.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-300" />
                      )}
                      <span className={`text-sm ${note.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {note.task}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Study Calendar - matching the grid from image */}
            <Card className="mt-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S', 'U'].slice(0, 7).map((day, index) => (
                    <div key={`day-${index}`} className="text-xs text-gray-500 text-center font-medium p-1">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {data.studyCalendar.slice(0, 49).map((day, index) => (
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
                
                <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-800">Try 15-min Pomodoro bursts this weekend</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}