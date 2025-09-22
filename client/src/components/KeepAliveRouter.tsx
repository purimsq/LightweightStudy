import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { KeepAliveProvider, KeepAliveWrapper } from './CustomKeepAlive';

interface KeepAliveRouterProps {
  children: React.ReactNode;
}

export default function KeepAliveRouter({ children }: KeepAliveRouterProps) {
  const [location] = useLocation();
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(new Set());

  // Track which routes have been visited
  useEffect(() => {
    setActiveRoutes(prev => new Set([...prev, location]));
  }, [location]);

  // Clone children and add keep-alive props
  const childrenWithKeepAlive = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        ...child.props,
        activeRoutes,
        currentLocation: location,
      });
    }
    return child;
  });

  return (
    <KeepAliveProvider>
      {childrenWithKeepAlive}
    </KeepAliveProvider>
  );
}

interface KeepAliveRouteProps {
  path: string;
  children: React.ReactNode;
  activeRoutes?: Set<string>;
  currentLocation?: string;
}

export function KeepAliveRoute({ path, children, activeRoutes, currentLocation }: KeepAliveRouteProps) {
  const isActive = currentLocation === path;
  const hasBeenVisited = activeRoutes?.has(path) || false;

  return (
    <KeepAliveWrapper 
      cacheKey={path} 
      isActive={isActive}
    >
      {children}
    </KeepAliveWrapper>
  );
}
