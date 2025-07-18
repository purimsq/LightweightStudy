import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import Dashboard from "@/pages/dashboard";
import Units from "@/pages/units";
import UnitDocuments from "@/pages/unit-documents";
import Assignments from "@/pages/assignments";
import StudyPlan from "@/pages/study-plan";
import AiChat from "@/pages/ai-chat";
import FloatingActionButton from "@/components/ui/floating-action-button";
import DocumentUploadModal from "@/components/modals/document-upload-modal";
import BreakReminder from "@/components/modals/break-reminder";
import { useState } from "react";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <FloatingActionButton onClick={() => setIsUploadModalOpen(true)} />
      <DocumentUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />
      <BreakReminder />
    </div>
  );
}

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/units" component={Units} />
        <Route path="/units/:id/documents" component={UnitDocuments} />
        <Route path="/assignments" component={Assignments} />
        <Route path="/study-plan" component={StudyPlan} />
        <Route path="/ai-chat" component={AiChat} />
        <Route component={() => <div className="p-6">Page not found</div>} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
