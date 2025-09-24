import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFont } from '@/contexts/FontContext';

const FONT_OPTIONS = [
  { value: 'inter', label: 'Inter', preview: 'Inter is a versatile typeface designed for computer screens.' },
  { value: 'roboto', label: 'Roboto', preview: 'Roboto has a dual nature. It has a mechanical skeleton.' },
  { value: 'opensans', label: 'Open Sans', preview: 'Open Sans is a humanist sans-serif typeface.' },
  { value: 'poppins', label: 'Poppins', preview: 'Poppins is a geometric sans-serif typeface.' },
  { value: 'lato', label: 'Lato', preview: 'Lato is a humanist sans-serif typeface.' },
  { value: 'montserrat', label: 'Montserrat', preview: 'Montserrat is inspired by the old posters and signs.' },
  { value: 'source-sans', label: 'Source Sans Pro', preview: 'Source Sans Pro is the first open source font family.' },
  { value: 'system', label: 'System UI', preview: 'Your operating system\'s default font.' }
];

const FONT_WEIGHT_OPTIONS = [
  { value: 'light', label: 'Light (300)', description: 'Thin and elegant' },
  { value: 'medium', label: 'Medium (500)', description: 'Balanced and readable' },
  { value: 'semibold', label: 'Semibold (600)', description: 'Strong and clear' },
  { value: 'bold', label: 'Bold (700)', description: 'Heavy and impactful' }
];

export default function FontSettings() {
  const { fontConfig, setFontFamily, setFontWeight } = useFont();

  const selectedFont = FONT_OPTIONS.find(font => font.value === fontConfig.family);
  const selectedWeight = FONT_WEIGHT_OPTIONS.find(weight => weight.value === fontConfig.weight);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🎨</span>
          Font Settings
        </CardTitle>
        <CardDescription>
          Customize the appearance of text throughout the application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Font Family Selection */}
        <div className="space-y-3">
          <Label htmlFor="font-family" className="text-sm font-medium">
            Font Family
          </Label>
          <Select value={fontConfig.family} onValueChange={setFontFamily}>
            <SelectTrigger id="font-family" className="w-full">
              <SelectValue placeholder="Select a font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{font.label}</span>
                    <span className="text-xs text-muted-foreground">{font.preview}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Font Preview */}
          {selectedFont && (
            <div className="p-4 bg-muted rounded-lg border">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Preview:</p>
                <p 
                  className="text-lg leading-relaxed"
                  style={{
                    fontFamily: `'${selectedFont.label}', system-ui, sans-serif`,
                    fontWeight: FONT_WEIGHT_OPTIONS.find(w => w.value === fontConfig.weight)?.value === 'light' ? '300' :
                               FONT_WEIGHT_OPTIONS.find(w => w.value === fontConfig.weight)?.value === 'medium' ? '500' :
                               FONT_WEIGHT_OPTIONS.find(w => w.value === fontConfig.weight)?.value === 'semibold' ? '600' : '700'
                  }}
                >
                  The quick brown fox jumps over the lazy dog. 1234567890
                </p>
                <p 
                  className="text-sm text-muted-foreground"
                  style={{
                    fontFamily: `'${selectedFont.label}', system-ui, sans-serif`,
                    fontWeight: FONT_WEIGHT_OPTIONS.find(w => w.value === fontConfig.weight)?.value === 'light' ? '300' :
                               FONT_WEIGHT_OPTIONS.find(w => w.value === fontConfig.weight)?.value === 'medium' ? '500' :
                               FONT_WEIGHT_OPTIONS.find(w => w.value === fontConfig.weight)?.value === 'semibold' ? '600' : '700'
                  }}
                >
                  {selectedFont.preview}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Font Weight Selection */}
        <div className="space-y-3">
          <Label htmlFor="font-weight" className="text-sm font-medium">
            Font Weight
          </Label>
          <Select value={fontConfig.weight} onValueChange={setFontWeight}>
            <SelectTrigger id="font-weight" className="w-full">
              <SelectValue placeholder="Select font weight" />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHT_OPTIONS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{weight.label}</span>
                    <span className="text-xs text-muted-foreground">{weight.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current Settings Summary */}
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Current Settings</p>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>Font: <span className="font-medium text-foreground">{selectedFont?.label}</span></span>
              <span>Weight: <span className="font-medium text-foreground">{selectedWeight?.label}</span></span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
