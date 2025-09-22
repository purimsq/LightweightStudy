import { useEffect, useRef, useCallback } from 'react';
import { usePageState } from '@/contexts/PageStateContext';

interface BackgroundTaskOptions {
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  persistOnNavigation?: boolean;
}

export function useBackgroundTasks(pageId: string) {
  const { pageState, addBackgroundTask, updateBackgroundTask, removeBackgroundTask } = usePageState(pageId);
  const activeTasksRef = useRef<Map<string, AbortController>>(new Map());

  // Clean up tasks when component unmounts
  useEffect(() => {
    return () => {
      // Don't cancel tasks if they should persist
      activeTasksRef.current.forEach((controller, taskId) => {
        const task = pageState?.backgroundTasks?.find(t => t.id === taskId);
        if (!task || !task.persistOnNavigation) {
          controller.abort();
        }
      });
    };
  }, [pageState?.backgroundTasks]);

  const startTask = useCallback((
    type: 'upload' | 'ai_generation' | 'processing' | 'download',
    taskFn: (signal: AbortSignal) => Promise<any>,
    options: BackgroundTaskOptions = {}
  ) => {
    const { onComplete, onError, onProgress, persistOnNavigation = true } = options;
    
    const controller = new AbortController();
    const taskId = addBackgroundTask({
      type,
      status: 'pending',
      progress: 0,
      persistOnNavigation,
    });

    activeTasksRef.current.set(taskId, controller);

    // Update task to running
    updateBackgroundTask(taskId, { status: 'running' });

    // Execute the task
    taskFn(controller.signal)
      .then((result) => {
        updateBackgroundTask(taskId, { 
          status: 'completed', 
          progress: 100,
          data: result 
        });
        onComplete?.(result);
        
        // Remove completed task after a delay
        setTimeout(() => {
          removeBackgroundTask(taskId);
          activeTasksRef.current.delete(taskId);
        }, 5000);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          updateBackgroundTask(taskId, { 
            status: 'failed',
            data: { error: error.message }
          });
          onError?.(error);
        }
        
        // Remove failed task after a delay
        setTimeout(() => {
          removeBackgroundTask(taskId);
          activeTasksRef.current.delete(taskId);
        }, 10000);
      });

    return taskId;
  }, [addBackgroundTask, updateBackgroundTask, removeBackgroundTask]);

  const updateTaskProgress = useCallback((taskId: string, progress: number) => {
    updateBackgroundTask(taskId, { progress });
  }, [updateBackgroundTask]);

  const cancelTask = useCallback((taskId: string) => {
    const controller = activeTasksRef.current.get(taskId);
    if (controller) {
      controller.abort();
      activeTasksRef.current.delete(taskId);
    }
    removeBackgroundTask(taskId);
  }, [removeBackgroundTask]);

  const getActiveTasks = useCallback(() => {
    return pageState?.backgroundTasks?.filter(task => 
      task.status === 'running' || task.status === 'pending'
    ) || [];
  }, [pageState?.backgroundTasks]);

  const getCompletedTasks = useCallback(() => {
    return pageState?.backgroundTasks?.filter(task => 
      task.status === 'completed' || task.status === 'failed'
    ) || [];
  }, [pageState?.backgroundTasks]);

  return {
    startTask,
    updateTaskProgress,
    cancelTask,
    getActiveTasks,
    getCompletedTasks,
    allTasks: pageState?.backgroundTasks || [],
  };
}

// Hook for file uploads with progress tracking
export function useFileUpload(pageId: string) {
  const { startTask, updateTaskProgress } = useBackgroundTasks(pageId);

  const uploadFile = useCallback((
    file: File,
    endpoint: string,
    onComplete?: (result: any) => void,
    onError?: (error: Error) => void
  ) => {
    return startTask(
      'upload',
      async (signal) => {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        
        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              updateTaskProgress(startTask.toString(), progress);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
          });

          signal.addEventListener('abort', () => {
            xhr.abort();
          });

          xhr.open('POST', endpoint);
          
          const token = localStorage.getItem('authToken');
          if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          }
          
          xhr.send(formData);
        });
      },
      {
        onComplete,
        onError,
        persistOnNavigation: true,
      }
    );
  }, [startTask, updateTaskProgress]);

  return { uploadFile };
}

// Hook for AI generation tasks
export function useAIGeneration(pageId: string) {
  const { startTask, updateTaskProgress } = useBackgroundTasks(pageId);

  const generateAI = useCallback((
    prompt: string,
    onComplete?: (result: any) => void,
    onError?: (error: Error) => void
  ) => {
    return startTask(
      'ai_generation',
      async (signal) => {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            message: prompt,
            sessionId: `session_${Date.now()}`,
          }),
          signal,
        });

        if (!response.ok) {
          throw new Error(`AI generation failed: ${response.statusText}`);
        }

        return response.json();
      },
      {
        onComplete,
        onError,
        persistOnNavigation: true,
      }
    );
  }, [startTask]);

  return { generateAI };
}
