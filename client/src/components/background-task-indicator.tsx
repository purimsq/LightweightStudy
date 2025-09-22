import React, { useState } from 'react';
import { usePageStateContext } from '@/contexts/PageStateContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Brain, 
  Download, 
  Settings, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

const taskIcons = {
  upload: Upload,
  ai_generation: Brain,
  processing: Settings,
  download: Download,
};

const taskColors = {
  pending: 'bg-yellow-500',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
};

export function BackgroundTaskIndicator() {
  const { pageStates, clearAllStates } = usePageStateContext();
  const [isExpanded, setIsExpanded] = useState(false);

  // Get all active tasks across all pages
  const allTasks = Object.entries(pageStates).flatMap(([pageId, state]) =>
    state.backgroundTasks.map(task => ({ ...task, pageId }))
  );

  const activeTasks = allTasks.filter(task => 
    task.status === 'running' || task.status === 'pending'
  );

  const completedTasks = allTasks.filter(task => 
    task.status === 'completed' || task.status === 'failed'
  );

  if (allTasks.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {activeTasks.length} active
            </Badge>
            {completedTasks.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {completedTasks.length} completed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Task List */}
        {isExpanded && (
          <div className="max-h-64 overflow-y-auto">
            {/* Active Tasks */}
            {activeTasks.map((task) => {
              const Icon = taskIcons[task.type];
              return (
                <div key={task.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium capitalize">
                      {task.type.replace('_', ' ')}
                    </span>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      taskColors[task.status]
                    )} />
                  </div>
                  
                  {task.progress !== undefined && (
                    <div className="space-y-1">
                      <Progress value={task.progress} className="h-1" />
                      <div className="text-xs text-gray-500 text-right">
                        {task.progress}%
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-1">
                    Page: {task.pageId}
                  </div>
                </div>
              );
            })}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">
                  Recently Completed
                </div>
                {completedTasks.slice(-3).map((task) => {
                  const Icon = taskIcons[task.type];
                  return (
                    <div key={task.id} className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      {task.status === 'completed' ? (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <Icon className="h-3 w-3" />
                      <span className="capitalize">
                        {task.type.replace('_', ' ')}
                      </span>
                      <span className="text-gray-400">
                        {task.pageId}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {isExpanded && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllStates}
              className="w-full text-xs text-gray-500 hover:text-gray-700"
            >
              Clear All States
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
