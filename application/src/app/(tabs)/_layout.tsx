import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { ArrowLeftRight, CloudOff, Home, Map, MessageSquare } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app/AppButton';
import { Screen } from '@/components/app/Screen';
import { StateView } from '@/components/app/StateView';
import { colors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { useParcel } from '@/providers/ParcelProvider';

function resolvedColor(color: unknown): string {
  return typeof color === 'string' ? color : colors.muted;
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { parcel, loading, error, refresh } = useParcel();

  if (loading && !parcel) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <StateView loading title={t('Cargando parcela')} description={t('Leyendo contexto y datos NASA.')} />
      </Screen>
    );
  }

  if (error && !parcel) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <StateView
          icon={CloudOff}
          title={t('No pudimos cargar la parcela')}
          description={error}
          action={<AppButton onPress={() => void refresh()}>{t('Reintentar')}</AppButton>}
        />
      </Screen>
    );
  }

  if (!parcel) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('Inicio'),
          tabBarButtonTestID: testIDs.navHome,
          tabBarIcon: ({ color }) => <Home size={22} color={resolvedColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('Mapa'),
          tabBarButtonTestID: testIDs.navMap,
          tabBarIcon: ({ color }) => <Map size={22} color={resolvedColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="comparison"
        options={{
          title: t('Rotaciones'),
          tabBarButtonTestID: testIDs.navRotations,
          tabBarIcon: ({ color }) => <ArrowLeftRight size={22} color={resolvedColor(color)} />,
        }}
      />
      <Tabs.Screen
        name="agent"
        options={{
          title: t('Agente'),
          tabBarButtonTestID: testIDs.navAgent,
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={resolvedColor(color)} />,
        }}
      />
    </Tabs>
  );
}
