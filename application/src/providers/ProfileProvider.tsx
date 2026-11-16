import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getMe, updateProfile, type UserProfile } from '@/services/api';
import { useSession } from './SessionProvider';

const PROFILE_CACHE_KEY = 'anden.profile.v1';

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
  }) => Promise<UserProfile>;
  refresh: () => void;
};

const ProfileContext = createContext<ProfileState | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { ready } = useSession();
  const queryClient = useQueryClient();
  const [cached, setCached] = useState<UserProfile | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void SecureStore.getItemAsync(PROFILE_CACHE_KEY)
      .then((raw) => {
        if (!mounted) return;
        if (raw) {
          try {
            setCached(JSON.parse(raw) as UserProfile);
          } catch {
            // A corrupt cache is ignored; the API remains the source of truth.
          }
        }
      })
      .catch(() => {
        // SecureStore may be unavailable on web; the online profile still works.
      })
      .finally(() => {
        if (mounted) setCacheLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: ready,
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (meQuery.data?.user) {
      void SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(meQuery.data.user)).catch(
        () => {
          // Caching is best-effort; the online profile still works.
        },
      );
    }
  }, [meQuery.data]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      setCached(data.user);
      queryClient.setQueryData(['me'], data);
      void SecureStore.setItemAsync(PROFILE_CACHE_KEY, JSON.stringify(data.user)).catch(() => {
        // Caching is best-effort.
      });
    },
  });

  const saveProfile = useCallback(
    async (input: {
      displayName: string | null;
      locale: string;
      profile: Record<string, unknown>;
      onboardingCompleted: boolean;
      consentVersion?: string | null;
    }) => {
      const data = await mutation.mutateAsync(input);
      return data.user;
    },
    [mutation],
  );

  const refresh = useCallback(() => {
    void meQuery.refetch();
  }, [meQuery]);

  const profile = meQuery.data?.user ?? cached;
  const loading = !ready || (!cacheLoaded && !profile) || (meQuery.isLoading && !profile);
  const error = meQuery.error
    ? meQuery.error instanceof Error
      ? meQuery.error.message
      : 'No se pudo cargar tu perfil'
    : null;

  const value = useMemo<ProfileState>(
    () => ({ profile, loading, error, saveProfile, refresh }),
    [profile, loading, error, saveProfile, refresh],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used inside ProfileProvider');
  return value;
}
