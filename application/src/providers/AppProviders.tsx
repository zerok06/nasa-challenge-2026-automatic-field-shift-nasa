import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AgentProvider } from './AgentProvider';
import { ComparisonProvider } from './ComparisonProvider';
import { ParcelProvider, useParcel } from './ParcelProvider';
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

function ParcelScopedProviders({ children }: { children: React.ReactNode }) {
  const { parcel } = useParcel();
  const key = parcel?.id ?? 'no-parcel';
  return (
    <ComparisonProvider key={`comparison-${key}`}>
      <AgentProvider key={`agent-${key}`}>{children}</AgentProvider>
    </ComparisonProvider>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ParcelProvider>
          <ParcelScopedProviders>{children}</ParcelScopedProviders>
        </ParcelProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
