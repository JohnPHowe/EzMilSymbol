import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Text, View } from 'react-native';

import { Sidebar } from '@/components/sidebar';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
        <View style={{ backgroundColor: 'darkgreen', paddingVertical: 4, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>
            UNCLASSIFIED
          </Text>
        </View>
        <View style={{ backgroundColor: '#000', paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '700' }}>EzMilSymbol</Text>
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
  );
}
