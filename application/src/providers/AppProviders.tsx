import React from 'react';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { AgentProvider } from './AgentProvider';
import { AgentSheetProvider } from './AgentSheetProvider';
import { ComparisonProvider } from './ComparisonProvider';
import { OfflineProvider } from './OfflineProvider';
import { ParcelProvider, useParcel } from './ParcelProvider';
import { PreferencesProvider, usePreferences } from './PreferencesProvider';
import { ProfileProvider } from './ProfileProvider';
import { SessionProvider } from './SessionProvider';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const { theme } = usePreferences();
  const systemScheme = useColorScheme();
  const mode = theme === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : theme;
  return <GluestackUIProvider mode={mode}>{children}</GluestackUIProvider>;
}

function ParcelScopedProviders({ children }: { children: React.ReactNode }) {
  const { parcel } = useParcel();
  const key = parcel?.id ?? 'no-parcel';
  return (
    <OfflineProvider key={`offline-${key}`}>
      <ComparisonProvider key={`comparison-${key}`}>
        <AgentProvider key={`agent-${key}`}>
          <AgentSheetProvider>{children}</AgentSheetProvider>
        </AgentProvider>
      </ComparisonProvider>
    </OfflineProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <PreferencesProvider>
        <ThemedRoot>
          <SessionProvider>
            <ProfileProvider>
              <ParcelProvider>
                <ParcelScopedProviders>{children}</ParcelScopedProviders>
              </ParcelProvider>
            </ProfileProvider>
          </SessionProvider>
        </ThemedRoot>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
