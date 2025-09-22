import { useState, useEffect, useCallback } from 'react';
import { usePageState } from '@/contexts/PageStateContext';

interface UsePageStateOptions {
  pageId: string;
  initialState?: any;
  persistOnNavigation?: boolean;
  persistOnRefresh?: boolean;
}

export function usePageStateHook<T = any>({
  pageId,
  initialState = {},
  persistOnNavigation = true,
  persistOnRefresh = true,
}: UsePageStateOptions) {
  const { pageState, updatePageState } = usePageState(pageId);
  
  // Initialize state from saved state or initial state
  const [state, setState] = useState<T>(() => {
    if (persistOnRefresh && pageState?.data) {
      return { ...initialState, ...pageState.data };
    }
    return initialState;
  });

  // Save state whenever it changes
  useEffect(() => {
    if (persistOnNavigation || persistOnRefresh) {
      updatePageState({
        data: state,
        lastUpdated: Date.now(),
      });
    }
  }, [state, updatePageState, persistOnNavigation, persistOnRefresh]);

  // Update state function
  const updateState = useCallback((updates: Partial<T> | ((prev: T) => T)) => {
    setState(prev => {
      if (typeof updates === 'function') {
        return updates(prev);
      }
      return { ...prev, ...updates };
    });
  }, []);

  // Reset state function
  const resetState = useCallback(() => {
    setState(initialState);
  }, [initialState]);

  return {
    state,
    updateState,
    resetState,
    isRestored: !!pageState?.data,
  };
}

// Hook for form state persistence
export function useFormState<T = any>(pageId: string, initialFormData: T) {
  return usePageStateHook<T>({
    pageId,
    initialState: initialFormData,
    persistOnNavigation: true,
    persistOnRefresh: true,
  });
}

// Hook for list state persistence (with filters, pagination, etc.)
export function useListState<T = any>(pageId: string, initialListState: T) {
  return usePageStateHook<T>({
    pageId,
    initialState: initialListState,
    persistOnNavigation: true,
    persistOnRefresh: true,
  });
}

// Hook for temporary state (only persists during navigation, not refresh)
export function useTempState<T = any>(pageId: string, initialState: T) {
  return usePageStateHook<T>({
    pageId,
    initialState,
    persistOnNavigation: true,
    persistOnRefresh: false,
  });
}
