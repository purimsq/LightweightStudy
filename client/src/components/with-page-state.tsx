import React, { ComponentType, useEffect } from 'react';
import { usePageState } from '@/contexts/PageStateContext';

interface WithPageStateOptions {
  pageId: string;
  restoreOnMount?: boolean;
  saveOnUnmount?: boolean;
}

export function withPageState<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithPageStateOptions
) {
  const { pageId, restoreOnMount = true, saveOnUnmount = true } = options;

  return function PageWithState(props: P) {
    const { pageState, updatePageState } = usePageState(pageId);

    // Restore page state on mount
    useEffect(() => {
      if (restoreOnMount && pageState?.data) {
        // Dispatch a custom event to restore page state
        window.dispatchEvent(new CustomEvent('pageStateRestore', {
          detail: { pageId, data: pageState.data }
        }));
      }
    }, [pageId, pageState?.data, restoreOnMount]);

    // Save page state on unmount
    useEffect(() => {
      return () => {
        if (saveOnUnmount) {
          // Dispatch a custom event to save page state
          window.dispatchEvent(new CustomEvent('pageStateSave', {
            detail: { pageId }
          }));
        }
      };
    }, [pageId, saveOnUnmount]);

    return <WrappedComponent {...props} />;
  };
}

// Hook for pages to easily save/restore state
export function usePageStateManager(pageId: string) {
  const { pageState, updatePageState } = usePageState(pageId);

  const saveState = (data: any) => {
    updatePageState({
      data,
      lastUpdated: Date.now(),
    });
  };

  const restoreState = () => {
    return pageState?.data || null;
  };

  const clearState = () => {
    updatePageState({
      data: null,
      lastUpdated: Date.now(),
    });
  };

  return {
    saveState,
    restoreState,
    clearState,
    currentState: pageState?.data,
    isRestored: !!pageState?.data,
  };
}
