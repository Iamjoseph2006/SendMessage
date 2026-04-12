import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

type AppThemeContextValue = {
  isDark: boolean;
  setDarkMode: (value: boolean) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export const lightPalette = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  textPrimary: '#1A2B44',
  textSecondary: '#6A7D95',
  border: '#E6EBF2',
  accent: '#1F7AE0',
};

export const darkPalette = {
  background: '#0F1724',
  surface: '#172235',
  textPrimary: '#E9F0FA',
  textSecondary: '#9CB0C9',
  border: '#24344D',
  accent: '#4D9BFF',
};

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const [isDark, setDarkMode] = useState(false);

  const value = useMemo(() => ({ isDark, setDarkMode }), [isDark]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme debe usarse dentro de AppThemeProvider.');
  }

  return context;
};
