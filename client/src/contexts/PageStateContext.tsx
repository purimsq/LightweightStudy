import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

// Define the structure for page states
interface PageState {
  [pageId: string]: {
    data: any;
    isLoading: boolean;
    error: string | null;
    lastUpdated: number;
    backgroundTasks: BackgroundTask[];
  };
}

interface BackgroundTask {
  id: string;
  type: 'upload' | 'ai_generation' | 'processing' | 'download';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  data?: any;
  startTime: number;
}

interface PageStateContextType {
  pageStates: PageState;
  updatePageState: (pageId: string, updates: Partial<PageState[string]>) => void;
  addBackgroundTask: (pageId: string, task: Omit<BackgroundTask, 'id' | 'startTime'>) => string;
  updateBackgroundTask: (pageId: string, taskId: string, updates: Partial<BackgroundTask>) => void;
  removeBackgroundTask: (pageId: string, taskId: string) => void;
  getPageState: (pageId: string) => PageState[string] | null;
  clearAllStates: () => void;
}

const PageStateContext = createContext<PageStateContextType | undefined>(undefined);

// Action types for the reducer
type PageStateAction =
  | { type: 'UPDATE_PAGE_STATE'; payload: { pageId: string; updates: Partial<PageState[string]> } }
  | { type: 'ADD_BACKGROUND_TASK'; payload: { pageId: string; task: Omit<BackgroundTask, 'id' | 'startTime'> } }
  | { type: 'UPDATE_BACKGROUND_TASK'; payload: { pageId: string; taskId: string; updates: Partial<BackgroundTask> } }
  | { type: 'REMOVE_BACKGROUND_TASK'; payload: { pageId: string; taskId: string } }
  | { type: 'CLEAR_ALL_STATES' }
  | { type: 'HYDRATE_STATE'; payload: PageState };

// Reducer function
function pageStateReducer(state: PageState, action: PageStateAction): PageState {
  switch (action.type) {
    case 'UPDATE_PAGE_STATE': {
      const { pageId, updates } = action.payload;
      return {
        ...state,
        [pageId]: {
          ...state[pageId],
          ...updates,
          lastUpdated: Date.now(),
        },
      };
    }

    case 'ADD_BACKGROUND_TASK': {
      const { pageId, task } = action.payload;
      const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newTask: BackgroundTask = {
        ...task,
        id: taskId,
        startTime: Date.now(),
      };

      return {
        ...state,
        [pageId]: {
          ...state[pageId],
          backgroundTasks: [...(state[pageId]?.backgroundTasks || []), newTask],
          lastUpdated: Date.now(),
        },
      };
    }

    case 'UPDATE_BACKGROUND_TASK': {
      const { pageId, taskId, updates } = action.payload;
      if (!state[pageId]) return state;

      return {
        ...state,
        [pageId]: {
          ...state[pageId],
          backgroundTasks: state[pageId].backgroundTasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          ),
          lastUpdated: Date.now(),
        },
      };
    }

    case 'REMOVE_BACKGROUND_TASK': {
      const { pageId, taskId } = action.payload;
      if (!state[pageId]) return state;

      return {
        ...state,
        [pageId]: {
          ...state[pageId],
          backgroundTasks: state[pageId].backgroundTasks.filter(task => task.id !== taskId),
          lastUpdated: Date.now(),
        },
      };
    }

    case 'CLEAR_ALL_STATES':
      return {};

    case 'HYDRATE_STATE':
      return action.payload;

    default:
      return state;
  }
}

// Provider component
export function PageStateProvider({ children }: { children: ReactNode }) {
  const [pageStates, dispatch] = useReducer(pageStateReducer, {});

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('pageStates');
    console.log('Loading page states from localStorage:', savedState);
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        console.log('Parsed page states:', parsedState);
        // Only restore states that are less than 24 hours old
        const now = Date.now();
        const filteredState: PageState = {};
        
        Object.entries(parsedState).forEach(([pageId, state]) => {
          if (now - (state as any).lastUpdated < 24 * 60 * 60 * 1000) {
            filteredState[pageId] = state as any;
          }
        });
        
        console.log('Filtered page states:', filteredState);
        dispatch({ type: 'HYDRATE_STATE', payload: filteredState });
      } catch (error) {
        console.error('Failed to load page states from localStorage:', error);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('Saving page states to localStorage:', pageStates);
      localStorage.setItem('pageStates', JSON.stringify(pageStates));
    }, 1000); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [pageStates]);

  const updatePageState = (pageId: string, updates: Partial<PageState[string]>) => {
    dispatch({ type: 'UPDATE_PAGE_STATE', payload: { pageId, updates } });
  };

  const addBackgroundTask = (pageId: string, task: Omit<BackgroundTask, 'id' | 'startTime'>): string => {
    const taskId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({ type: 'ADD_BACKGROUND_TASK', payload: { pageId, task: { ...task, id: taskId } } });
    return taskId;
  };

  const updateBackgroundTask = (pageId: string, taskId: string, updates: Partial<BackgroundTask>) => {
    dispatch({ type: 'UPDATE_BACKGROUND_TASK', payload: { pageId, taskId, updates } });
  };

  const removeBackgroundTask = (pageId: string, taskId: string) => {
    dispatch({ type: 'REMOVE_BACKGROUND_TASK', payload: { pageId, taskId } });
  };

  const getPageState = (pageId: string): PageState[string] | null => {
    return pageStates[pageId] || null;
  };

  const clearAllStates = () => {
    dispatch({ type: 'CLEAR_ALL_STATES' });
    localStorage.removeItem('pageStates');
  };

  return (
    <PageStateContext.Provider
      value={{
        pageStates,
        updatePageState,
        addBackgroundTask,
        updateBackgroundTask,
        removeBackgroundTask,
        getPageState,
        clearAllStates,
      }}
    >
      {children}
    </PageStateContext.Provider>
  );
}

// Hook to use the context
export function usePageState(pageId: string) {
  const context = useContext(PageStateContext);
  if (!context) {
    console.warn('usePageState used outside PageStateProvider, returning default values');
    return {
      pageState: null,
      updatePageState: () => {},
      addBackgroundTask: () => '',
      updateBackgroundTask: () => {},
      removeBackgroundTask: () => {},
    };
  }

  const { getPageState, updatePageState, addBackgroundTask, updateBackgroundTask, removeBackgroundTask } = context;
  
  const pageState = getPageState(pageId);

  return {
    pageState,
    updatePageState: (updates: Partial<PageState[string]>) => updatePageState(pageId, updates),
    addBackgroundTask: (task: Omit<BackgroundTask, 'id' | 'startTime'>) => addBackgroundTask(pageId, task),
    updateBackgroundTask: (taskId: string, updates: Partial<BackgroundTask>) => updateBackgroundTask(pageId, taskId, updates),
    removeBackgroundTask: (taskId: string) => removeBackgroundTask(pageId, taskId),
  };
}

// Hook to access the full context
export function usePageStateContext() {
  const context = useContext(PageStateContext);
  if (!context) {
    console.warn('usePageStateContext used outside PageStateProvider, returning default values');
    return {
      pageStates: {},
      updatePageState: () => {},
      addBackgroundTask: () => '',
      updateBackgroundTask: () => {},
      removeBackgroundTask: () => {},
      getPageState: () => null,
      clearAllStates: () => {},
    };
  }
  return context;
}
