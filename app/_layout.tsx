import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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

  return (
    <ThemeContext.Provider value={{ colorScheme, toggle }}>
      <ThemeProvider value={colorScheme === 'dark' ? CharcoalDarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: 'darkgreen', paddingVertical: 4, alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>
              UNCLASSIFIED
            </Text>
          </View>
          <View style={{ backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: 'white', fontSize: 20, fontWeight: '700', flex: 1 }}>EzMilSymbol</Text>
            <TouchableOpacity onPress={toggle} style={{ padding: 4 }} activeOpacity={0.7}>
              <FontAwesome6 name={colorScheme === 'dark' ? 'sun' : 'moon'} size={18} color="white" />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <Sidebar />
            <View style={{ flex: 1 }}>
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
