import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPersistence() {
  const [counter, setCounter] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}] ${message}`);
  };

  // Load counter from localStorage on mount
  useEffect(() => {
    addLog('🚀 Component mounted, loading from localStorage...');
    try {
      const saved = localStorage.getItem('test-counter');
      addLog(`📖 Retrieved from localStorage: "${saved}"`);
      
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        addLog(`🔢 Parsed value: ${parsed}`);
        setCounter(parsed);
        addLog(`✅ Counter set to: ${parsed}`);
      } else {
        addLog('📝 No saved value found, starting with 0');
      }
    } catch (error) {
      addLog(`❌ Error loading from localStorage: ${error}`);
    }
  }, []);

  // Save counter to localStorage when it changes
  useEffect(() => {
    if (counter > 0) {
      addLog(`💾 Saving counter ${counter} to localStorage...`);
      try {
        localStorage.setItem('test-counter', counter.toString());
        addLog(`✅ Successfully saved ${counter} to localStorage`);
      } catch (error) {
        addLog(`❌ Error saving to localStorage: ${error}`);
      }
    }
  }, [counter]);

  const increment = () => {
    const newValue = counter + 1;
    addLog(`➕ Incrementing from ${counter} to ${newValue}`);
    setCounter(newValue);
  };

  const reset = () => {
    addLog(`🔄 Resetting counter to 0`);
    setCounter(0);
    localStorage.removeItem('test-counter');
    addLog(`🗑️ Removed from localStorage`);
  };

  const testLocalStorage = () => {
    addLog('🧪 Testing localStorage directly...');
    try {
      localStorage.setItem('test-key', 'test-value');
      const retrieved = localStorage.getItem('test-key');
      addLog(`✅ localStorage test: set "test-value", got "${retrieved}"`);
      localStorage.removeItem('test-key');
      addLog('🧹 Cleaned up test key');
    } catch (error) {
      addLog(`❌ localStorage test failed: ${error}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Persistence Test Page</h1>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Counter Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-2xl font-bold">Count: {counter}</div>
            <div className="flex gap-2">
              <Button onClick={increment}>+1</Button>
              <Button onClick={reset} variant="outline">Reset</Button>
              <Button onClick={testLocalStorage} variant="secondary">Test localStorage</Button>
            </div>
            <div className="text-sm text-gray-600">
              This counter should persist when you navigate away and come back.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Debug Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet...</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono mb-1">
                    {log}
                  </div>
                ))
              )}
            </div>
            <Button 
              onClick={() => setLogs([])} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Clear Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
