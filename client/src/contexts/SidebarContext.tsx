import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  defaultCollapsed: boolean;
  setDefaultCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Load default collapse preference from localStorage
  const [defaultCollapsed, setDefaultCollapsedState] = useState(() => {
    const saved = localStorage.getItem('sidebarDefaultCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Initialize sidebar state based on default preference
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Update sidebar state when default preference changes
  useEffect(() => {
    setIsCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  const setIsCollapsedState = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const setDefaultCollapsed = (collapsed: boolean) => {
    setDefaultCollapsedState(collapsed);
    localStorage.setItem('sidebarDefaultCollapsed', JSON.stringify(collapsed));
  };

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      setIsCollapsed: setIsCollapsedState, 
      toggleSidebar, 
      defaultCollapsed, 
      setDefaultCollapsed 
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
