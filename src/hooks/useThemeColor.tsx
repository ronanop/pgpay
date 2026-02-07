import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Convert hex to HSL values (without the hsl() wrapper, just "H S% L%")
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse r, g, b values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  // Return HSL values in the format Tailwind expects: "H S% L%"
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Calculate a darker version for ring/focus states
function getDarkerHSL(hsl: string): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  
  const h = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  const l = Math.max(0, parseInt(parts[3]) - 10);
  
  return `${h} ${s}% ${l}%`;
}

export function useThemeColor() {
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  useEffect(() => {
    fetchPrimaryColor();
  }, []);

  const fetchPrimaryColor = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'primary_color')
        .maybeSingle();

      if (error) throw error;

      if (data?.value) {
        applyPrimaryColor(data.value);
        setPrimaryColor(data.value);
      }
    } catch (error) {
      console.error('Error fetching primary color:', error);
    }
  };

  const applyPrimaryColor = (hexColor: string) => {
    const hslValue = hexToHSL(hexColor);
    const darkerHsl = getDarkerHSL(hslValue);
    
    // Apply to CSS custom properties
    document.documentElement.style.setProperty('--primary', hslValue);
    document.documentElement.style.setProperty('--ring', hslValue);
    
    // For dark mode, slightly adjust the primary color
    const darkHsl = hslValue.replace(/(\d+)%$/, (match, l) => {
      return `${Math.min(100, parseInt(l) + 10)}%`;
    });
    
    // Also update success color if it's the same shade family
    // This keeps the visual consistency
  };

  return { primaryColor, refetch: fetchPrimaryColor };
}

// Provider component to apply theme on app load
export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  useThemeColor();
  return <>{children}</>;
}
