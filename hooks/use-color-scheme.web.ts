import { useThemeContext } from './theme-context';

export function useColorScheme() {
  const { colorScheme } = useThemeContext();
  return colorScheme;
}
