import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicProvider } from "@/contexts/MusicContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import Sidebar from "@/components/layout/sidebar";
import TopBar from "@/components/layout/top-bar";
import GlobalMusicPlayer from "@/components/layout/global-music-player";
import Dashboard from "@/pages/dashboard";
import Units from "@/pages/units";
import UnitDocuments from "@/pages/unit-documents";
import DocumentViewer from "@/pages/document-viewer";
import Notes from "@/pages/notes";
import Summary from "@/pages/summary";
import Quiz from "@/pages/quiz";
import Assignments from "@/pages/assignments";
import AssignmentViewer from "@/pages/assignment-viewer";
import StudyPlan from "@/pages/study-plan";
import AiChat from "@/pages/ai-chat";
import Progress from "@/pages/progress";
import Music from "@/pages/music";
import LocalMusic from "@/pages/local-music";
import StudyDocuments from "@/pages/study-documents";
import Mail from "@/pages/mail";
import Sanctuary from "@/pages/sanctuary";
import FloatingActionButton from "@/components/ui/floating-action-button";
import DocumentUploadModal from "@/components/modals/document-upload-modal";
import BreakReminder from "@/components/modals/break-reminder";
import { useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";

function AppLayout({ children }: { children: React.ReactNode }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-0' : ''}`}>
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
      <GlobalMusicPlayer />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Full-screen music pages without layout */}
      <Route path="/music" component={Music} />
      <Route path="/local-music" component={LocalMusic} />
      
      {/* All other pages with normal layout */}
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/units" component={Units} />
            <Route path="/units/:id/documents" component={UnitDocuments} />
            <Route path="/documents/:id" component={DocumentViewer} />
            <Route path="/documents/:id/notes">
              {params => <Notes documentId={params.id} />}
            </Route>
            <Route path="/documents/:id/summary">
              {params => <Summary documentId={params.id} />}
            </Route>
            <Route path="/documents/:id/quiz">
              {params => <Quiz documentId={params.id} />}
            </Route>
            <Route path="/assignments" component={Assignments} />
            <Route path="/assignments/:id/view" component={AssignmentViewer} />
            <Route path="/study-plan" component={StudyPlan} />
            <Route path="/ai-chat" component={AiChat} />
            <Route path="/mail" component={Mail} />
            <Route path="/sanctuary" component={Sanctuary} />
            <Route path="/progress" component={Progress} />
            <Route path="/study-documents" component={StudyDocuments} />
            <Route component={() => <div className="p-6">Page not found</div>} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <MusicProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </MusicProvider>
      </SidebarProvider>
    </QueryClientProvider>
  );
}

export default App;
