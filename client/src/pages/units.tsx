import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, FolderOpen, BookOpen, FileText, Trash2, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Unit, InsertUnit } from "@shared/schema";

const iconMap = {
  "user-md": "👨‍⚕️",
  "shield-alt": "🛡️",
  "heartbeat": "💓",
  "brain": "🧠",
  "dna": "🧬",
  "microscope": "🔬",
  "pills": "💊",
  "stethoscope": "🩺",
};

const colorMap = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600", 
  yellow: "bg-yellow-100 text-yellow-600",
  purple: "bg-purple-100 text-purple-600",
  red: "bg-red-100 text-red-600",
  orange: "bg-orange-100 text-orange-600",
  pink: "bg-pink-100 text-pink-600",
  indigo: "bg-indigo-100 text-indigo-600",
};

function CreateUnitDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertUnit>>({
    name: "",
    description: "",
    color: "blue",
    icon: "folder",
  });
  const { toast } = useToast();

  const createUnitMutation = useMutation({
    mutationFn: async (data: InsertUnit) => {
      const response = await apiRequest("POST", "/api/units", data);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all unit-related queries including dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsOpen(false);
      setFormData({ name: "", description: "", color: "blue", icon: "folder" });
      toast({ title: "Unit created successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating unit", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    createUnitMutation.mutate(formData as InsertUnit);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          Create Unit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Unit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Unit name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Color</label>
              <Select 
                value={formData.color} 
                onValueChange={(value) => setFormData({ ...formData, color: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(colorMap).map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded mr-2 ${colorMap[color as keyof typeof colorMap]}`} />
                        {color.charAt(0).toUpperCase() + color.slice(1)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Icon</label>
              <Select 
                value={formData.icon} 
                onValueChange={(value) => setFormData({ ...formData, icon: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(iconMap).map(([key, emoji]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center">
                        <span className="mr-2">{emoji}</span>
                        {key}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createUnitMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createUnitMutation.isPending ? "Creating..." : "Create Unit"}
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

function UnitCard({ unit }: { unit: Unit }) {
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();
  
  // Use a more specific query key and fetch all documents to filter locally
  const { data: allDocuments = [] } = useQuery({
    queryKey: ["/api/documents"],
  });
  
  const documents = allDocuments.filter((doc: any) => doc.unitId === unit.id);

  const deleteUnitMutation = useMutation({
    mutationFn: async (unitId: number) => {
      const response = await apiRequest("DELETE", `/api/units/${unitId}`);
      if (!response.ok) throw new Error("Failed to delete unit");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setShowDeleteDialog(false);
      toast({ title: "Unit deleted successfully!" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting unit", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const progressPercentage = unit.totalTopics > 0 
    ? Math.round((unit.completedTopics / unit.totalTopics) * 100) 
    : 0;

  const colorClass = colorMap[unit.color as keyof typeof colorMap] || colorMap.blue;
  const icon = iconMap[unit.icon as keyof typeof iconMap] || "📁";

  return (
    <Card className="unit-card">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl ${colorClass}`}>
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg text-neutral-800">{unit.name}</CardTitle>
            <p className="text-sm text-neutral-600 mt-1">{unit.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm text-neutral-600 mb-2">
            <span>Progress</span>
            <span>{unit.completedTopics} of {unit.totalTopics} topics</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-neutral-600">
            <FileText className="w-4 h-4 mr-1" />
            {documents.length} documents
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation(`/units/${unit.id}/documents`)}
            >
              <FolderOpen className="w-4 h-4 mr-1" />
              Open
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <DeleteConfirmDialog
          isOpen={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={() => deleteUnitMutation.mutate(unit.id)}
          title="Delete Unit"
          description="This will permanently delete this unit and ALL its contents including documents, notes, and assignments. This action cannot be undone."
          itemName={unit.name}
          isDeleting={deleteUnitMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}

export default function Units() {
  const { data: units = [], isLoading } = useQuery({
    queryKey: ["/api/units"],
  });

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
            <h1 className="text-3xl font-bold text-neutral-800">Study Units</h1>
            <p className="text-neutral-600 mt-1">
              Organize your study materials by subject
            </p>
          </div>
          <CreateUnitDialog />
        </div>

        {units.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <BookOpen className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
                <h3 className="text-lg font-medium text-neutral-600 mb-2">No units yet</h3>
                <p className="text-neutral-500 mb-6">
                  Create your first study unit to get started
                </p>
                <CreateUnitDialog />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((unit: Unit) => (
              <UnitCard key={unit.id} unit={unit} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
