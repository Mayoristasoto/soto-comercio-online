import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface ThemePreferences {
  theme_mode: 'light' | 'dark' | 'system';
  custom_colors: ThemeColors | null;
  font_size: 'normal' | 'large' | 'xlarge';
  high_contrast: boolean;
  reduced_motion: boolean;
}

export const useThemePreferences = () => {
  const { setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_theme_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading theme preferences:', error);
        return;
      }

      if (data) {
        // Aplicar tema
        setTheme(data.theme_mode);

        // Aplicar colores personalizados
        if (data.custom_colors && typeof data.custom_colors === 'object') {
          const colors = data.custom_colors as unknown as ThemeColors;
          if (colors.primary && colors.secondary && colors.accent) {
            applyCustomColors(colors);
          }
        }

        // Aplicar otras preferencias (se manejan por useAccessibility)
      }
    } catch (error) {
      console.error('Error in loadPreferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePreferences = async (preferences: Partial<ThemePreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Preparar los datos para el upsert
      const updateData: any = {
        ...preferences,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_theme_preferences')
        .upsert({
          user_id: user.id,
          ...updateData
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving theme preferences:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in savePreferences:', error);
      throw error;
    }
  };

  const applyCustomColors = (colors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--secondary', colors.secondary);
    root.style.setProperty('--accent', colors.accent);
  };

  const clearCustomColors = () => {
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--secondary');
    root.style.removeProperty('--accent');
  };

  useEffect(() => {
    loadPreferences();
  }, []);

  return {
    isLoading,
    loadPreferences,
    savePreferences,
    applyCustomColors,
    clearCustomColors
  };
};
