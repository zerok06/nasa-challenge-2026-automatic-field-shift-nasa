import React, { useState } from 'react';
import { Image, ImageBackground, View } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app/AppButton';
import { Button, ButtonIcon } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Screen } from '@/components/app/Screen';
import { testIDs } from '@/design-system/testIDs';

const INTRO_KEY = 'anden.intro.completed.v1';
const slides = [
  {
    image: require('../../../assets/images/parcel-covers/field-1.jpg'),
    title: 'Tu parcela, tus decisiones',
    description: 'Anden reúne la información de tu chacra para ayudarte a planificar cada campaña.',
    imageLabel: 'Chacra cultivada en un valle andino',
  },
  {
    image: require('../../../assets/images/parcel-covers/field-2.jpg'),
    title: 'Compara opciones con calma',
    description: 'Mira los planes A, B y C con el agua y los precios que conoces.',
    imageLabel: 'Cultivos en hileras en un paisaje andino',
  },
  {
    image: require('../../../assets/images/parcel-covers/field-3.jpg'),
    title: 'Prueba antes de decidir',
    description: 'Ajusta agua y precio, revisa los supuestos y guarda tus datos para consultarlos sin señal.',
    imageLabel: 'Cultivo de ají en una chacra andina',
  },
];

export function IntroScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const slide = slides[index];

  const finish = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await SecureStore.setItemAsync(INTRO_KEY, '1');
    } catch {
      // Keep the introduction best-effort when secure storage is unavailable.
    }
    router.replace('/(tabs)/agent');
  };

  return (
    <Screen scroll={false} edges={[]} testID="intro.screen">
        <ImageBackground
          source={slide.image}
          resizeMode="cover"
          accessibilityRole="image"
          accessibilityLabel={t(slide.imageLabel)}
          className="flex-1"
          style={{ flex: 1 }}
        >
          <Svg
            pointerEvents="none"
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Defs>
              <LinearGradient id="introCoverContrast" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0.38" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0.82" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100" height="100" fill="url(#introCoverContrast)" />
          </Svg>
          <View
            className="flex-1 justify-between px-6"
            style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
          >
            <View testID="brand.header">
              <HStack testID="intro.brand" className="items-center gap-3">
                <Image
                  source={require('../../../assets/images/anden-icon.png')}
                  style={{ width: 46, height: 46 }}
                  resizeMode="contain"
                  accessibilityLabel={t('Marca Anden')}
                />
                <VStack className="gap-0">
                  <Text className="text-xl font-extrabold tracking-[2px] text-white">ANDEN</Text>
                  <Text className="text-sm text-white">{t('Rotaciones claras para tu chacra.')}</Text>
                </VStack>
                <View className="flex-1" />
                <AppButton
                  testID={testIDs.introSkip}
                  tone="ghost"
                  size="sm"
                  onPress={() => void finish()}
                  isDisabled={busy}
                  className="bg-white/95"
                >
                  {t('Saltar')}
                </AppButton>
              </HStack>
            </View>
            <VStack className="gap-6">
              <VStack className="gap-3">
                <Text className="text-3xl font-bold leading-10 text-white">{t(slide.title)}</Text>
                <Text className="text-lg leading-7 text-white">{t(slide.description)}</Text>
              </VStack>
              <HStack className="items-center justify-center gap-2" accessibilityRole="progressbar">
                {slides.map((item, dotIndex) => (
                  <View
                    key={item.title}
                    accessible
                    accessibilityLabel={t('Paso {{current}} de {{total}}', {
                      current: dotIndex + 1,
                      total: slides.length,
                    })}
                    accessibilityState={{ selected: dotIndex === index }}
                    style={{
                      width: dotIndex === index ? 24 : 9,
                      height: 9,
                      borderRadius: 8,
                      backgroundColor: dotIndex === index ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                    }}
                  />
                ))}
              </HStack>
              <HStack className="items-center gap-3">
                {index > 0 ? (
                  <Button
                    variant="outline"
                    size="icon"
                    testID={testIDs.introBack}
                    accessibilityRole="button"
                    accessibilityLabel={t('Volver a la diapositiva anterior')}
                    onPress={() => setIndex((current) => Math.max(current - 1, 0))}
                    isDisabled={busy}
                    className="h-14 w-14 rounded-full border-white/80 bg-white/10 px-0"
                  >
                    <ButtonIcon as={ArrowLeft} width={22} height={22} className="text-white" />
                  </Button>
                ) : null}
                <AppButton
                  testID={index === slides.length - 1 ? testIDs.introStart : testIDs.introNext}
                  loading={busy}
                  onPress={() => {
                    if (index === slides.length - 1) void finish();
                    else setIndex((current) => Math.min(current + 1, slides.length - 1));
                  }}
                  className="min-h-14 flex-1"
                >
                  {index === slides.length - 1 ? t('Comenzar') : t('Continuar')}
                </AppButton>
              </HStack>
            </VStack>
          </View>
        </ImageBackground>
    </Screen>
  );
}
