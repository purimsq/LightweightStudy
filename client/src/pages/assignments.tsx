import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle, Clock, AlertCircle, FileText, Trash2, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Assignment, InsertAssignment } from "@shared/schema";
import { format } from "date-fns";

function CreateAssignmentDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertAssignment>>({
    title: "",
    description: "",
    type: "assignment",
    deadline: "",
    status: "pending",
  });
  const { toast } = useToast();

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: InsertAssignment) => {
      const response = await apiRequest("POST", "/api/assignments", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all assignment-related queries including dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      setIsOpen(false);
      setFormData({
        title: "",
        description: "",
        type: "assignment", 
        deadline: "",
        status: "pending",
      });
      toast({ title: "Assignment created successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating assignment", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.deadline) {
      toast({ 
        title: "Error", 
        description: "Please fill in all required fields",
        variant: "destructive" 
      });
      return;
    }
    
    createAssignmentMutation.mutate({
      ...formData,
      deadline: formData.deadline, // Backend will handle date conversion
    } as InsertAssignment);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
          <DialogDescription>
            Add a new assignment or CAT with a deadline
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={formData.title || ""}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Assignment title"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Assignment details"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="cat">CAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deadline</label>
              <Input
                type="datetime-local"
                value={formData.deadline || ""}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createAssignmentMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createAssignmentMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConfirmDialog({ 
  isOpen, 
  onOpenChange, 
  onConfirm, 
  title, 
  description,
  itemName,
  isDeleting 
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  itemName: string;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <DialogTitle className="text-red-600">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            {description}
            <br />
            <span className="font-semibold text-neutral-800">"{itemName}"</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentCard({ assignment }: { assignment: Assignment }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/assignments/${assignment.id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate assignments and refresh dashboard progress
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      toast({ title: "Status updated successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const response = await apiRequest("DELETE", `/api/assignments/${assignmentId}`);
      if (!response.ok) throw new Error("Failed to delete assignment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      setShowDeleteDialog(false);
      toast({ title: "Assignment deleted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting assignment", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "in_progress":
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "in_progress":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const isOverdue = new Date(assignment.deadline) < new Date() && assignment.status !== "completed";
  const daysUntilDeadline = Math.ceil(
    (new Date(assignment.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="unit-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant={assignment.type === "cat" ? "destructive" : "secondary"}>
                {assignment.type.toUpperCase()}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  Overdue
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg text-neutral-800">{assignment.title}</CardTitle>
            {assignment.description && (
              <p className="text-sm text-neutral-600 mt-1 line-clamp-2">
                {assignment.description}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="ml-2 text-red-600 hover:text-red-700 hover:border-red-300"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center text-sm text-neutral-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>Due: {format(new Date(assignment.deadline), "MMM d, yyyy 'at' h:mm a")}</span>
        </div>
        
        {!isOverdue && daysUntilDeadline >= 0 && (
          <div className="text-sm text-neutral-600">
            {daysUntilDeadline === 0 ? "Due today" : `${daysUntilDeadline} days remaining`}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Badge className={`${getStatusColor(assignment.status)} flex items-center space-x-1`}>
            {getStatusIcon(assignment.status)}
            <span className="capitalize">{assignment.status.replace("_", " ")}</span>
          </Badge>
          
          <Select
            value={assignment.status}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={() => deleteAssignmentMutation.mutate(assignment.id)}
          title="Delete Assignment"
          description="This will permanently delete this assignment. This action cannot be undone."
          itemName={assignment.title}
          isDeleting={deleteAssignmentMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}

export default function Assignments() {
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["/api/assignments"],
  });

  const pendingAssignments = assignments.filter((a: Assignment) => a.status === "pending");
  const inProgressAssignments = assignments.filter((a: Assignment) => a.status === "in_progress");
  const completedAssignments = assignments.filter((a: Assignment) => a.status === "completed");

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-neutral-200 rounded w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-neutral-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-neutral-800">Assignments & CATs</h1>
            <p className="text-neutral-600 mt-1">
              Track your assignments and continuous assessment tests
            </p>
          </div>
          <CreateAssignmentDialog />
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 mb-2">No assignments yet</h3>
                <p className="text-neutral-500 mb-6">
                  Create your first assignment or CAT to get started
                </p>
                <CreateAssignmentDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Pending Assignments */}
            {pendingAssignments.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
                  Pending ({pendingAssignments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingAssignments.map((assignment: Assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              </div>
            )}

            {/* In Progress Assignments */}
            {inProgressAssignments.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  In Progress ({inProgressAssignments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgressAssignments.map((assignment: Assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Assignments */}
            {completedAssignments.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-neutral-800 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                  Completed ({completedAssignments.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedAssignments.map((assignment: Assignment) => (
                    <AssignmentCard key={assignment.id} assignment={assignment} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
