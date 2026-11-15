import React, { useCallback } from 'react';
import { Volume2 } from 'lucide-react-native';
import * as Speech from 'expo-speech';
import { useTranslation } from 'react-i18next';

import { AppIconButton } from '@/components/app/AppButton';

export function SpeakerButton({
  text,
  testID,
}: {
  text: string;
  testID?: string;
}) {
  const { t } = useTranslation();
  const speak = useCallback(() => {
    void Speech.stop();
    Speech.speak(text, { language: 'es-PE', rate: 0.92, pitch: 1 });
  }, [text]);

  return (
    <AppIconButton
      icon={Volume2}
      label={t('Escuchar')}
      tone="water"
      onPress={speak}
      testID={testID}
    />
  );
}
