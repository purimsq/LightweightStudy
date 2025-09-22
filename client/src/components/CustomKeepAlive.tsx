import React, { createContext, useContext, useRef, useEffect, useState } from 'react';

interface KeepAliveContextType {
  cache: Map<string, React.ReactNode>;
  addToCache: (key: string, component: React.ReactNode) => void;
  removeFromCache: (key: string) => void;
  getFromCache: (key: string) => React.ReactNode | null;
}

const KeepAliveContext = createContext<KeepAliveContextType | null>(null);

export function KeepAliveProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef(new Map<string, React.ReactNode>()).current;

  const addToCache = (key: string, component: React.ReactNode) => {
    console.log(`📦 Adding to cache: ${key}`);
    cache.set(key, component);
  };

  const removeFromCache = (key: string) => {
    console.log(`🗑️ Removing from cache: ${key}`);
    cache.delete(key);
  };

  const getFromCache = (key: string) => {
    const cached = cache.get(key);
    console.log(`📖 Getting from cache: ${key}`, !!cached);
    return cached || null;
  };

  return (
    <KeepAliveContext.Provider value={{ cache, addToCache, removeFromCache, getFromCache }}>
      {children}
    </KeepAliveContext.Provider>
  );
}

export function useKeepAlive() {
  const context = useContext(KeepAliveContext);
  if (!context) {
    throw new Error('useKeepAlive must be used within KeepAliveProvider');
  }
  return context;
}

interface KeepAliveWrapperProps {
  children: React.ReactNode;
  cacheKey: string;
  isActive: boolean;
}

export function KeepAliveWrapper({ children, cacheKey, isActive }: KeepAliveWrapperProps) {
  const { addToCache, getFromCache } = useKeepAlive();
  const [cachedComponent, setCachedComponent] = useState<React.ReactNode>(null);

  useEffect(() => {
    if (isActive) {
      // When active, add to cache and show the component
      addToCache(cacheKey, children);
      setCachedComponent(children);
    } else {
      // When inactive, try to get from cache
      const cached = getFromCache(cacheKey);
      if (cached) {
        setCachedComponent(cached);
      }
    }
  }, [isActive, cacheKey, children, addToCache, getFromCache]);

  if (isActive) {
    return <>{children}</>;
  }

  return <>{cachedComponent}</>;
}
