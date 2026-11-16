import React from 'react';

import { AppButton } from '@/components/app/AppButton';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Text } from '@/components/ui/text';

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
  confirmTestID,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmTestID?: string;
}) {
  return (
    <AlertDialog isOpen={isOpen} onClose={onCancel}>
      <AlertDialogBackdrop />
      <AlertDialogContent className="bg-card">
        <AlertDialogHeader>
          <Text className="text-lg font-bold text-foreground">{title}</Text>
        </AlertDialogHeader>
        <AlertDialogBody>
          <Text className="text-sm text-muted-foreground">{message}</Text>
        </AlertDialogBody>
        <AlertDialogFooter className="gap-2">
          <AppButton tone="outline" onPress={onCancel}>
            {cancelLabel}
          </AppButton>
          <AppButton
            tone={destructive ? 'destructive' : 'primary'}
            onPress={onConfirm}
            testID={confirmTestID}
          >
            {confirmLabel}
          </AppButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
