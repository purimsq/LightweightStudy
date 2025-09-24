import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MusicProvider } from "@/contexts/MusicContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SocketProvider } from "@/contexts/SocketContext";
import { FontProvider } from "@/contexts/FontContext";
import ProtectedRoute from "@/components/ProtectedRoute";
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
import Messages from "@/pages/messages";
import Sanctuary from "@/pages/sanctuary";
import StudyCompanion from "@/pages/studycompanion";
import TestPersistence from "@/pages/test-persistence";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import VerifyOTP from "@/pages/verify-otp";
import FloatingActionButton from "@/components/ui/floating-action-button";
import DocumentUploadModal from "@/components/modals/document-upload-modal";
import BreakReminder from "@/components/modals/break-reminder";
import { useState } from "react";
import { useSidebar } from "@/contexts/SidebarContext";
import LoadingScreen from "@/components/loading-screen";

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
  const [showLoadingScreen, setShowLoadingScreen] = useState(() => {
    // Check if we should show loading screen based on conditions
    const hasSeenLoadingScreen = localStorage.getItem('hasSeenLoadingScreen');
    const isAuthenticated = localStorage.getItem('authToken');
    const currentPath = window.location.pathname;
    const sessionStartTime = sessionStorage.getItem('sessionStartTime');
    
    // Show loading screen if:
    // 1. Fresh app start (no session start time) AND not authenticated
    // 2. User is on login/signup pages and refreshes (before authentication)
    const isFreshStart = !sessionStartTime;
    const isOnAuthPages = currentPath === '/login' || currentPath === '/signup';
    
    const shouldShow = (!isAuthenticated && isFreshStart) || 
                      (!isAuthenticated && isOnAuthPages && hasSeenLoadingScreen);
    
    // Mark session start time
    if (!sessionStartTime) {
      sessionStorage.setItem('sessionStartTime', Date.now().toString());
    }
    
    return shouldShow;
  });

  const handleLoadingComplete = () => {
    // Mark as seen for this session
    localStorage.setItem('hasSeenLoadingScreen', 'true');
    setShowLoadingScreen(false);
  };

  // For testing: Add a way to reset loading screen
  // You can call this in browser console: localStorage.removeItem('hasSeenLoadingScreen'); location.reload();

  // Show loading screen on initial load
  if (showLoadingScreen) {
    return <LoadingScreen onComplete={handleLoadingComplete} />;
  }

  return (
    <Switch>
      {/* Full-screen auth pages without layout */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/verify-otp/:email" component={VerifyOTP} />
      
      {/* Full-screen music pages without layout */}
      <Route path="/music" component={Music} />
      <Route path="/local-music" component={LocalMusic} />
      
      {/* All other pages with normal layout - Protected Routes */}
      <Route>
        <ProtectedRoute>
          <AppLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/units" component={Units} />
              <Route path="/units/:id/documents" component={UnitDocuments} />
              <Route path="/documents/:id" component={DocumentViewer} />
              <Route path="/documents/:id/notes" component={Notes} />
              <Route path="/documents/:id/summary" component={Summary} />
              <Route path="/documents/:id/quiz" component={Quiz} />
              <Route path="/assignments" component={Assignments} />
              <Route path="/assignments/:id/view" component={AssignmentViewer} />
              <Route path="/study-plan" component={StudyPlan} />
              <Route path="/ai-chat" component={AiChat} />
              <Route path="/messages" component={Messages} />
              <Route path="/sanctuary" component={Sanctuary} />
              <Route path="/studycompanion" component={StudyCompanion} />
              <Route path="/progress" component={Progress} />
              <Route path="/study-documents" component={StudyDocuments} />
              <Route path="/test-persistence" component={TestPersistence} />
            </Switch>
          </AppLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <FontProvider>
        <AuthProvider>
          <SocketProvider>
            <SidebarProvider>
              <MusicProvider>
                <TooltipProvider>
                  <Toaster />
                  <Router />
                </TooltipProvider>
              </MusicProvider>
            </SidebarProvider>
          </SocketProvider>
        </AuthProvider>
      </FontProvider>
    </QueryClientProvider>
  );
}

export default App;
