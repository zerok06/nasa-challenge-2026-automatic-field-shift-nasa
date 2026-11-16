/**
 * ProfileProvider — web port of the native ProfileProvider.
 * Keeps the farmer's display name, locale and consent so Inicio can greet them
 * and the app can tell whether onboarding is done.
 */
import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MeResponse, UserProfile } from '../lib/types';

type ProfileState = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  saveProfile: (input: {
    displayName: string | null;
    locale: string;
    profile: Record<string, unknown>;
    onboardingCompleted: boolean;
    consentVersion?: string | null;
  }) => Promise<MeResponse>;
  refresh: () => void;
};

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });

  const mutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (data) => queryClient.setQueryData(['me'], data),
  });

  const saveProfile = useCallback(
    async (input: Parameters<ProfileState['saveProfile']>[0]) => mutation.mutateAsync(input),
    [mutation],
  );

  const value = useMemo<ProfileState>(
    () => ({
      profile: query.data?.user ?? null,
      loading: query.isLoading,
      error: query.error instanceof Error ? query.error.message : null,
      saveProfile,
      refresh: () => void query.refetch(),
    }),
    [query.data, query.error, query.isLoading, saveProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used inside ProfileProvider');
  return value;
}
