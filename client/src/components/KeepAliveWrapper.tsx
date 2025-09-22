import React from 'react';
import { KeepAlive } from 'react-activation';

interface KeepAliveWrapperProps {
  children: React.ReactNode;
  cacheKey: string;
}

export default function KeepAliveWrapper({ children, cacheKey }: KeepAliveWrapperProps) {
  return (
    <KeepAlive cacheKey={cacheKey}>
      {children}
    </KeepAlive>
  );
}
