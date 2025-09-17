import { useState } from "react";
import { Heart, Plus, Calendar, Clock, User, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  estimatedTime: string;
  dueDate: string;
  daysUntilDue: number;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  createdBy: string;
  icon: 'warning' | 'clock' | 'check';
}

const mockAssignments: Assignment[] = [
  {
    id: "1",
    title: "Complete Anatomy Chapter 5",
    description: "Read through the cardiovascular system chapter and complete the practice questions at the end. Focus on understanding the blood flow through the heart chambers.",
    subject: "Anatomy",
    estimatedTime: "2 hours",
    dueDate: "Sep 20, 2025",
    daysUntilDue: 3,
    priority: 'high',
    status: 'pending',
    createdBy: "Mitchell",
    icon: 'warning',
  },
  {
    id: "2",
    title: "Review Immunology Notes",
    description: "Go through the immune system lecture notes and create a mind map of the different types of immune responses. Include both innate and adaptive immunity.",
    subject: "Immunology",
    estimatedTime: "1.5 hours",
    dueDate: "Sep 22, 2025",
    daysUntilDue: 5,
    priority: 'medium',
    status: 'pending',
    createdBy: "Mitchell",
    icon: 'clock',
  },
  {
    id: "3",
    title: "Practice Nursing Skills",
    description: "Practice the hand hygiene technique and sterile field setup. Record a video demonstrating proper procedure and submit for review.",
    subject: "Nursing Skills",
    estimatedTime: "3 hours",
    dueDate: "Sep 25, 2025",
    daysUntilDue: 8,
    priority: 'high',
    status: 'pending',
    createdBy: "Mitchell",
    icon: 'warning',
  },
  {
    id: "4",
    title: "Study Group Preparation",
    description: "Prepare discussion points for the study group meeting. Focus on the topics that were challenging in this week's lectures.",
    subject: "General",
    estimatedTime: "1 hour",
    dueDate: "Sep 19, 2025",
    daysUntilDue: 2,
    priority: 'low',
    status: 'pending',
    createdBy: "Mitchell",
    icon: 'check',
  },
];

export default function SanctuaryPage() {
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(mockAssignments[0]);
  const [showNewAssignment, setShowNewAssignment] = useState(false);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'clock':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'check':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sanctuary</h1>
              <p className="text-sm text-gray-600">Your assignments and tasks</p>
            </div>
          </div>
          <Button
            onClick={() => setShowNewAssignment(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Assignment
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Assignments List */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Assignments
              </h2>
              
              <div className="space-y-4">
                {mockAssignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    onClick={() => setSelectedAssignment(assignment)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedAssignment?.id === assignment.id 
                        ? 'bg-amber-50 border-amber-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getIcon(assignment.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{assignment.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="w-4 h-4" />
                            <span>{assignment.subject}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{assignment.estimatedTime}</span>
                          </div>
                          <span>Due in {assignment.daysUntilDue} days</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getPriorityColor(assignment.priority)}>
                          {assignment.priority}
                        </Badge>
                        <span className="text-sm text-gray-500">{assignment.dueDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Column - Assignment Details */}
          <div className="lg:col-span-1">
            {selectedAssignment && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedAssignment.title}</h3>
                  <Badge className={getPriorityColor(selectedAssignment.priority)}>
                    {selectedAssignment.priority}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600 mb-4">
                  Due: {selectedAssignment.dueDate} • Est: {selectedAssignment.estimatedTime}
                </div>

                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-sm text-gray-600">{selectedAssignment.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Subject:</span>
                    <p className="text-gray-600">{selectedAssignment.subject}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Status:</span>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(selectedAssignment.status)}
                      <span className="text-gray-600 capitalize">{selectedAssignment.status}</span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Created by:</span>
                    <p className="text-gray-600">{selectedAssignment.createdBy}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Days until due:</span>
                    <p className="text-gray-600">{selectedAssignment.daysUntilDue} days</p>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white flex-1">
                    Mark Complete
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Start Task
                  </Button>
                </div>
              </Card>
            )}

            {/* Additional Task Card - Show next assignment if available */}
            {(() => {
              const currentIndex = mockAssignments.findIndex(a => a.id === selectedAssignment?.id);
              const nextAssignment = currentIndex >= 0 && currentIndex < mockAssignments.length - 1 
                ? mockAssignments[currentIndex + 1] 
                : null;
              
              return nextAssignment && (
                <Card className="p-4 mt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{nextAssignment.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{nextAssignment.description}</p>
                  <div className="text-sm text-gray-500">
                    Due: {nextAssignment.dueDate} Est: {nextAssignment.estimatedTime}
                  </div>
                </Card>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Button
        onClick={() => setShowNewAssignment(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-lg"
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}
