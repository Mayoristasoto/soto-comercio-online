import { useEffect } from 'react';
import { useThemePreferences } from '@/hooks/useThemePreferences';

export const ThemeLoader = ({ children }: { children: React.ReactNode }) => {
  const { isLoading } = useThemePreferences();

  // El hook se encarga de cargar y aplicar las preferencias automáticamente
  // No necesitamos hacer nada más aquí

  return <>{children}</>;
};
