import { createContext, useContext } from 'react';

export type ColorScheme = 'light' | 'dark';

export type ThemeContextType = {
  colorScheme: ColorScheme;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextType>({
  colorScheme: 'light',
  toggle: () => {},
});

export function useThemeContext() {
  return useContext(ThemeContext);
}
