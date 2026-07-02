import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useRef, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Sidebar } from '@/components/sidebar';
import { ThemeContext, type ColorScheme } from '@/hooks/theme-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

const CharcoalDarkTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#374151', card: '#374151' },
};

export default function RootLayout() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const toggle = () => setColorScheme(s => (s === 'light' ? 'dark' : 'light'));
  const [skipFocused, setSkipFocused] = useState(false);
  const mainRef = useRef<View>(null);

  return (
    <ThemeContext.Provider value={{ colorScheme, toggle }}>
      <ThemeProvider value={colorScheme === 'dark' ? CharcoalDarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          {Platform.OS === 'web' && (
            <TouchableOpacity
              onPress={() => (mainRef.current as unknown as HTMLElement | null)?.focus()}
              onFocus={() => setSkipFocused(true)}
              onBlur={() => setSkipFocused(false)}
              accessibilityRole="button"
              accessibilityLabel="Skip to main content"
              style={{
                position: 'absolute',
                top: skipFocused ? 8 : -40,
                left: 8,
                zIndex: 100,
                backgroundColor: '#0a7ea4',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700' }}>Skip to main content</Text>
            </TouchableOpacity>
          )}
          <View style={{ backgroundColor: 'darkgreen', paddingVertical: 4, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>
              UNCLASSIFIED
            </Text>
          </View>
          <View style={{ backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', flex: 1 }}>EzMilSymbol</Text>
            <TouchableOpacity
              onPress={toggle}
              style={{ padding: 4 }}
              activeOpacity={0.7}
              accessibilityRole="switch"
              accessibilityLabel="Dark mode"
              accessibilityState={{ checked: colorScheme === 'dark' }}
              aria-checked={colorScheme === 'dark'}
            >
              <FontAwesome6 name={colorScheme === 'dark' ? 'sun' : 'moon'} size={18} color="white" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <Sidebar />
            <View ref={mainRef} tabIndex={-1} style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
              </Stack>
            </View>
          </View>
        </View>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
