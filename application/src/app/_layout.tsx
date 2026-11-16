import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/AppProviders';
import { usePreferences } from '@/providers/PreferencesProvider';
import '../../global.css';

function AppStatusBar() {
  const { theme } = usePreferences();
  const systemScheme = useColorScheme();
  const dark = theme === 'dark' || (theme === 'system' && systemScheme === 'dark');
  return <StatusBar style={dark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <AppStatusBar />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
            <Stack.Screen name="intro" options={{ animation: 'fade' }} />
            <Stack.Screen name="parcel-new" />
            <Stack.Screen name="parcel-profile" />
            <Stack.Screen name="parcel-economics" />
            <Stack.Screen name="parcel-irrigation" />
            <Stack.Screen name="scenario" />
            <Stack.Screen name="plan-save" />
            <Stack.Screen name="plan-review" />
            <Stack.Screen name="sources" />
            <Stack.Screen name="settings" />
          </Stack>
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
