import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the structure for page states
interface PageState {
  data: Record<string, any>;
  lastUpdated: number;
}

interface PageStateStore {
  // Page states indexed by pageId
  pageStates: Record<string, PageState>;
  
  // Actions
  updatePageState: (pageId: string, data: Record<string, any>) => void;
  getPageState: (pageId: string) => PageState | null;
  clearPageState: (pageId: string) => void;
  clearAllStates: () => void;
  
  // Background tasks
  backgroundTasks: Record<string, any[]>;
  addBackgroundTask: (pageId: string, task: any) => void;
  removeBackgroundTask: (pageId: string, taskId: string) => void;
  getBackgroundTasks: (pageId: string) => any[];
}

export const usePageStateStore = create<PageStateStore>()(
  persist(
    (set, get) => ({
      // Initial state
      pageStates: {},
      backgroundTasks: {},

      // Update page state
      updatePageState: (pageId: string, data: Record<string, any>) => {
        console.log(`🔄 Updating page state for ${pageId}:`, data);
        set((state) => ({
          pageStates: {
            ...state.pageStates,
            [pageId]: {
              data,
              lastUpdated: Date.now(),
            },
          },
        }));
        console.log(`✅ Page state updated for ${pageId}`);
      },

      // Get page state
      getPageState: (pageId: string) => {
        const state = get().pageStates[pageId];
        console.log(`📖 Getting page state for ${pageId}:`, state);
        return state || null;
      },

      // Clear specific page state
      clearPageState: (pageId: string) => {
        console.log(`🗑️ Clearing page state for ${pageId}`);
        set((state) => {
          const newPageStates = { ...state.pageStates };
          delete newPageStates[pageId];
          return { pageStates: newPageStates };
        });
      },

      // Clear all states
      clearAllStates: () => {
        console.log(`🧹 Clearing all page states`);
        set({ pageStates: {}, backgroundTasks: {} });
      },

      // Background task management
      addBackgroundTask: (pageId: string, task: any) => {
        console.log(`➕ Adding background task for ${pageId}:`, task);
        set((state) => ({
          backgroundTasks: {
            ...state.backgroundTasks,
            [pageId]: [...(state.backgroundTasks[pageId] || []), task],
          },
        }));
      },

      removeBackgroundTask: (pageId: string, taskId: string) => {
        console.log(`➖ Removing background task ${taskId} for ${pageId}`);
        set((state) => ({
          backgroundTasks: {
            ...state.backgroundTasks,
            [pageId]: (state.backgroundTasks[pageId] || []).filter(
              (task) => task.id !== taskId
            ),
          },
        }));
      },

      getBackgroundTasks: (pageId: string) => {
        const tasks = get().backgroundTasks[pageId] || [];
        console.log(`📋 Getting background tasks for ${pageId}:`, tasks);
        return tasks;
      },
    }),
    {
      name: 'page-state-storage', // localStorage key
      // Only persist page states, not background tasks (they're temporary)
      partialize: (state) => ({ pageStates: state.pageStates }),
    }
  )
);

// Convenience hooks for specific pages
export const useDashboardStore = () => {
  const { getPageState, updatePageState } = usePageStateStore();
  const pageId = 'dashboard';
  
  const pageState = getPageState(pageId);
  const data = pageState?.data || {};
  
  const updateData = (newData: Record<string, any>) => {
    updatePageState(pageId, { ...data, ...newData });
  };
  
  return {
    data,
    updateData,
    counter: data.counter || 0,
    setCounter: (counter: number) => updateData({ counter }),
  };
};

export const useDocumentViewerStore = (documentId: number) => {
  const { getPageState, updatePageState } = usePageStateStore();
  const pageId = `document-viewer-${documentId}`;
  
  const pageState = getPageState(pageId);
  const data = pageState?.data || {};
  
  const updateData = (newData: Record<string, any>) => {
    updatePageState(pageId, { ...data, ...newData });
  };
  
  return {
    data,
    updateData,
    viewMode: data.viewMode || 'text',
    setViewMode: (viewMode: 'text' | 'original') => updateData({ viewMode }),
  };
};

export const useAssignmentsStore = () => {
  const { getPageState, updatePageState } = usePageStateStore();
  const pageId = 'assignments';
  
  const pageState = getPageState(pageId);
  const data = pageState?.data || {};
  
  const updateData = (newData: Record<string, any>) => {
    updatePageState(pageId, { ...data, ...newData });
  };
  
  return {
    data,
    updateData,
    showCreateDialog: data.showCreateDialog || false,
    setShowCreateDialog: (show: boolean) => updateData({ showCreateDialog: show }),
  };
};

export const useAIChatStore = () => {
  const { getPageState, updatePageState } = usePageStateStore();
  const pageId = 'ai-chat';
  
  const pageState = getPageState(pageId);
  const data = pageState?.data || {};
  
  const updateData = (newData: Record<string, any>) => {
    updatePageState(pageId, { ...data, ...newData });
  };
  
  return {
    data,
    updateData,
    messages: data.messages || [],
    setMessages: (messages: any[]) => updateData({ messages }),
    addMessage: (message: any) => {
      const currentMessages = data.messages || [];
      updateData({ messages: [...currentMessages, message] });
    },
  };
};
