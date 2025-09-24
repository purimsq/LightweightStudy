import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface FontConfig {
  family: string;
  weight: 'light' | 'medium' | 'semibold' | 'bold';
}

interface FontContextType {
  fontConfig: FontConfig;
  setFontFamily: (family: string) => void;
  setFontWeight: (weight: 'light' | 'medium' | 'semibold' | 'bold') => void;
  applyFontConfig: () => void;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

const FONT_FAMILIES = {
  'inter': 'Inter',
  'roboto': 'Roboto', 
  'opensans': 'Open Sans',
  'poppins': 'Poppins',
  'lato': 'Lato',
  'montserrat': 'Montserrat',
  'source-sans': 'Source Sans Pro',
  'system': 'System UI'
};

const FONT_WEIGHTS = {
  'light': '300',
  'medium': '500', 
  'semibold': '600',
  'bold': '700'
};

export function FontProvider({ children }: { children: ReactNode }) {
  const [fontConfig, setFontConfig] = useState<FontConfig>({
    family: 'inter',
    weight: 'medium'
  });

  // Load font config from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('fontConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setFontConfig(config);
      } catch (error) {
        console.error('Failed to parse saved font config:', error);
      }
    }
  }, []);

  // Apply font config to document
  const applyFontConfig = () => {
    const fontFamily = FONT_FAMILIES[fontConfig.family as keyof typeof FONT_FAMILIES] || 'Inter';
    const fontWeight = FONT_WEIGHTS[fontConfig.weight];
    
    // Apply to document body
    document.body.style.fontFamily = `'${fontFamily}', system-ui, sans-serif`;
    document.body.style.fontWeight = fontWeight;
    
    // Apply to CSS custom properties for components
    document.documentElement.style.setProperty('--app-font-family', `'${fontFamily}', system-ui, sans-serif`);
    document.documentElement.style.setProperty('--app-font-weight', fontWeight);
  };

  // Apply font config whenever it changes
  useEffect(() => {
    applyFontConfig();
    // Save to localStorage
    localStorage.setItem('fontConfig', JSON.stringify(fontConfig));
  }, [fontConfig]);

  const setFontFamily = (family: string) => {
    setFontConfig(prev => ({ ...prev, family }));
  };

  const setFontWeight = (weight: 'light' | 'medium' | 'semibold' | 'bold') => {
    setFontConfig(prev => ({ ...prev, weight }));
  };

  return (
    <FontContext.Provider value={{
      fontConfig,
      setFontFamily,
      setFontWeight,
      applyFontConfig
    }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}
