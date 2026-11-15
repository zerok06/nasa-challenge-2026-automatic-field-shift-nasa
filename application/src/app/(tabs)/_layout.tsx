import React from 'react';
import { PixelRatio, useColorScheme } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { ArrowLeftRight, CloudOff, Home, MessageCircle, Sprout } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app/AppButton';
import { Screen } from '@/components/app/Screen';
import { StateView } from '@/components/app/StateView';
import { colors, darkColors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { useParcel } from '@/providers/ParcelProvider';
import { useProfile } from '@/providers/ProfileProvider';

function resolvedColor(color: unknown): string {
  return typeof color === 'string' ? color : colors.muted;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const largeText = PixelRatio.getFontScale() > 1.5;
  const { parcel, loading, error, refresh } = useParcel();
  const { profile, loading: profileLoading, error: profileError, refresh: refreshProfile } =
    useProfile();
  const needsProfile = !profileLoading && !profile?.onboarding_completed_at;

  if ((loading || profileLoading) && !parcel) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <StateView
          loading
          title={t('Cargando tu perfil')}
          description={t('Preparando Anden.')}
        />
      </Screen>
    );
  }

  if ((error || profileError) && !parcel && !profile) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <StateView
          icon={CloudOff}
          title={t('No pudimos cargar tus datos')}
          description={profileError ?? error ?? t('Revisa la conexión e intenta de nuevo.')}
          action={
            <AppButton
              onPress={() => {
                void refresh();
                refreshProfile();
              }}
            >
              {t('Reintentar')}
            </AppButton>
          }
        />
      </Screen>
    );
  }

  if (needsProfile && !parcel) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: dark ? darkColors.primary : colors.primary,
        tabBarInactiveTintColor: dark ? darkColors.muted : colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: !largeText,
        tabBarStyle: {
          backgroundColor: dark ? darkColors.surface : colors.surface,
          borderTopColor: dark ? darkColors.border : colors.border,
          borderTopWidth: 1,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Inicio'),
          tabBarButtonTestID: testIDs.navHome,
          tabBarIcon: ({ color }) => <Home size={24} color={resolvedColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="comparison"
        options={{
          title: t('Comparar'),
          tabBarButtonTestID: testIDs.navRotations,
          tabBarIcon: ({ color }) => <ArrowLeftRight size={24} color={resolvedColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: t('Preguntar'),
          tabBarButtonTestID: testIDs.navAgent,
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={resolvedColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="parcel"
        options={{
          title: t('Mi parcela'),
          tabBarButtonTestID: testIDs.navParcel,
          tabBarIcon: ({ color }) => <Sprout size={24} color={resolvedColor(color)} />,
        }}
      />
    </Tabs>
  );
}
