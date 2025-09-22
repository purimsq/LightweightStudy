import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import Dashboard from '@/pages/dashboard';
import Units from '@/pages/units';
import UnitDocuments from '@/pages/unit-documents';
import DocumentViewer from '@/pages/document-viewer';
import Notes from '@/pages/notes';
import Summary from '@/pages/summary';
import Quiz from '@/pages/quiz';
import Assignments from '@/pages/assignments';
import AssignmentViewer from '@/pages/assignment-viewer';
import StudyPlan from '@/pages/study-plan';
import AiChat from '@/pages/ai-chat';
import Messages from '@/pages/messages';
import Sanctuary from '@/pages/sanctuary';
import StudyCompanion from '@/pages/studycompanion';
import Progress from '@/pages/progress';
import TestPersistence from '@/pages/test-persistence';
import StudyDocuments from '@/pages/study-documents';

// Create component factories that return the actual components
const createComponentFactories = () => ({
  dashboard: () => <Dashboard />,
  units: () => <Units />,
  assignments: () => <Assignments />,
  'study-plan': () => <StudyPlan />,
  'ai-chat': () => <AiChat />,
  messages: () => <Messages />,
  sanctuary: () => <Sanctuary />,
  studycompanion: () => <StudyCompanion />,
  progress: () => <Progress />,
  'test-persistence': () => <TestPersistence />,
  'study-documents': () => <StudyDocuments />,
  'unit-documents': () => <UnitDocuments />,
  'document-viewer': () => <DocumentViewer />,
  'assignment-viewer': () => <AssignmentViewer />,
});

export default function PageContainer() {
  const [location] = useLocation();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [dynamicRoutes, setDynamicRoutes] = useState<Map<string, React.ReactNode>>(new Map());
  
  // Use refs to store persistent component instances
  const componentInstancesRef = useRef<Map<string, React.ReactNode>>(new Map());
  const componentFactories = useMemo(() => createComponentFactories(), []);

  // Initialize component instances once
  useEffect(() => {
    if (componentInstancesRef.current.size === 0) {
      console.log('🚀 Initializing component instances...');
      Object.entries(componentFactories).forEach(([key, factory]) => {
        componentInstancesRef.current.set(key, factory());
      });
      console.log(`✅ Initialized ${componentInstancesRef.current.size} component instances`);
    }
  }, [componentFactories]);

  useEffect(() => {
    console.log(`🔄 Route changed to: ${location}`);
    
    // Handle static routes
    if (location === '/' || location === '/dashboard') {
      setCurrentPage('dashboard');
    } else if (location === '/units') {
      setCurrentPage('units');
    } else if (location === '/assignments') {
      setCurrentPage('assignments');
    } else if (location === '/study-plan') {
      setCurrentPage('study-plan');
    } else if (location === '/ai-chat') {
      setCurrentPage('ai-chat');
    } else if (location === '/messages') {
      setCurrentPage('messages');
    } else if (location === '/sanctuary') {
      setCurrentPage('sanctuary');
    } else if (location === '/studycompanion') {
      setCurrentPage('studycompanion');
    } else if (location === '/progress') {
      setCurrentPage('progress');
    } else if (location === '/test-persistence') {
      setCurrentPage('test-persistence');
    } else if (location === '/study-documents') {
      setCurrentPage('study-documents');
    } else if (location.startsWith('/units/') && location.includes('/documents')) {
      setCurrentPage('unit-documents');
    } else if (location.startsWith('/documents/') && !location.includes('/notes') && !location.includes('/summary') && !location.includes('/quiz')) {
      setCurrentPage('document-viewer');
    } else if (location.startsWith('/assignments/') && location.includes('/view')) {
      setCurrentPage('assignment-viewer');
    } else if (location.startsWith('/documents/') && location.includes('/notes')) {
      const docId = location.split('/')[2];
      setCurrentPage(`notes-${docId}`);
      // Create dynamic component if not exists
      if (!dynamicRoutes.has(`notes-${docId}`)) {
        setDynamicRoutes(prev => new Map(prev.set(`notes-${docId}`, <Notes documentId={docId} />)));
      }
    } else if (location.startsWith('/documents/') && location.includes('/summary')) {
      const docId = location.split('/')[2];
      setCurrentPage(`summary-${docId}`);
      // Create dynamic component if not exists
      if (!dynamicRoutes.has(`summary-${docId}`)) {
        setDynamicRoutes(prev => new Map(prev.set(`summary-${docId}`, <Summary documentId={docId} />)));
      }
    } else if (location.startsWith('/documents/') && location.includes('/quiz')) {
      const docId = location.split('/')[2];
      setCurrentPage(`quiz-${docId}`);
      // Create dynamic component if not exists
      if (!dynamicRoutes.has(`quiz-${docId}`)) {
        setDynamicRoutes(prev => new Map(prev.set(`quiz-${docId}`, <Quiz documentId={docId} />)));
      }
    } else {
      setCurrentPage('not-found');
    }
  }, [location, dynamicRoutes]);

  console.log(`🎯 Current page: ${currentPage}, Total components: ${componentInstancesRef.current.size}`);

  // Render all components but only show the current one
  return (
    <div style={{ position: 'relative' }}>
      {/* Static components */}
      {Array.from(componentInstancesRef.current.entries()).map(([key, component]) => (
        <div
          key={key}
          style={{
            display: currentPage === key ? 'block' : 'none',
            position: currentPage === key ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: currentPage === key ? 1 : -1,
          }}
        >
          {component}
        </div>
      ))}
      
      {/* Dynamic components */}
      {Array.from(dynamicRoutes.entries()).map(([key, component]) => (
        <div
          key={key}
          style={{
            display: currentPage === key ? 'block' : 'none',
            position: currentPage === key ? 'relative' : 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: currentPage === key ? 1 : -1,
          }}
        >
          {component}
        </div>
      ))}
      
      {/* Not found */}
      {currentPage === 'not-found' && (
        <div className="p-6">Page not found</div>
      )}
    </div>
  );
}
