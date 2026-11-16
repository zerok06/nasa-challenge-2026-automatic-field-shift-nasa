import React from 'react';
import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/app/AppButton';
import {
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@/components/ui/modal';
import { Pressable } from '@/components/ui/pressable';
import { ScrollView } from '@/components/ui/scroll-view';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors } from '@/design-system/tokens';
import { formatCropName } from '@/lib/format';
import type { Crop } from '@/services/api';

/**
 * Lets the farmer jump to a crop from the catalog.
 *
 * Every catalog crop is already listed on the economics screen, so this is a
 * navigational shortcut rather than an "add" step: picking one closes the sheet
 * and the caller scrolls to that crop's card.
 */
export function CropPicker({
  crops,
  selectedIds,
  onSelect,
  onClose,
}: {
  crops: Crop[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const chosen = new Set(selectedIds);

  return (
    <Modal isOpen onClose={onClose}>
      <ModalBackdrop />
      <ModalContent className="max-h-[70%] bg-card">
        <ModalHeader>
          <Text className="text-lg font-bold text-foreground">{t('Elige un cultivo')}</Text>
        </ModalHeader>
        <ModalBody>
          <ScrollView>
            <VStack className="gap-1">
              {crops.map((crop) => {
                const isChosen = chosen.has(crop.id);
                return (
                  <Pressable
                    key={crop.id}
                    onPress={() => onSelect(crop.id)}
                    accessibilityRole="button"
                    accessibilityLabel={formatCropName(crop.id, crop.local_name)}
                    className="min-h-12 flex-row items-center justify-between gap-3 rounded-xl px-3 py-2 web:hover:bg-muted/60"
                  >
                    <VStack className="flex-1">
                      <Text className="text-base font-semibold text-foreground">
                        {formatCropName(crop.id, crop.local_name)}
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        {formatCropName(crop.family)}
                      </Text>
                    </VStack>
                    {isChosen ? (
                      <Check size={20} color={colors.primary} accessibilityElementsHidden />
                    ) : null}
                  </Pressable>
                );
              })}
            </VStack>
          </ScrollView>
        </ModalBody>
        <ModalFooter>
          <AppButton tone="outline" onPress={onClose}>
            {t('Cerrar')}
          </AppButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
