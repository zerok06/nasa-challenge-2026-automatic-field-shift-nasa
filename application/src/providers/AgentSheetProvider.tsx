import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, useColorScheme, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { AppButton, AppIconButton } from '@/components/app/AppButton';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { colors, darkColors } from '@/design-system/tokens';
import { testIDs } from '@/design-system/testIDs';
import { useAgent } from '@/providers/AgentProvider';

type AgentSheetState = {
  visible: boolean;
  open: (prompt?: string) => void;
  close: () => void;
};

const AgentSheetContext = createContext<AgentSheetState | null>(null);

const SUGGESTIONS = [
  {
    label: '¿Por qué no sale la ganancia?',
    prompt: '¿Por qué no se calcula la ganancia estimada de mi plan?',
  },
  {
    label: 'No sé cuánta agua uso',
    prompt: 'No sé cuánta agua uso por campaña. ¿Cómo la puedo estimar?',
  },
  {
    label: '¿Qué es análisis de suelo?',
    prompt: '¿Qué es un análisis de suelo y por qué lo necesito?',
  },
];

function AgentSheet({
  visible,
  onClose,
  initialPrompt,
  onPromptConsumed,
}: {
  visible: boolean;
  onClose: () => void;
  initialPrompt: string | null;
  onPromptConsumed: () => void;
}) {
  const { t } = useTranslation();
  const dark = useColorScheme() === 'dark';
  const { messages, input, setInput, sending, error, send } = useAgent();

  useEffect(() => {
    if (!visible || !initialPrompt) return;
    onPromptConsumed();
    void send(initialPrompt);
  }, [initialPrompt, onPromptConsumed, send, visible]);

  const sendMessage = useCallback(
    (text?: string) => {
      const value = (text ?? input).trim();
      if (!value || sending) return;
      setInput('');
      void send(value);
    },
    [input, send, sending, setInput],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      testID={testIDs.agentSheet}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.35)',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('Cerrar')} />
        <KeyboardAvoidingView behavior="padding">
          <VStack
            className="max-h-[82%] gap-3 rounded-t-3xl border border-border bg-card p-4"
            style={{ backgroundColor: dark ? darkColors.surface : colors.surface }}
          >
            <HStack className="items-center justify-between">
              <VStack className="flex-1">
                <Text className="text-lg font-bold text-foreground">{t('Preguntar al agente')}</Text>
                <Text className="text-sm text-muted-foreground">
                  {t('Te ayudo con los datos de tu parcela, sin salir de aquí.')}
                </Text>
              </VStack>
              <AppIconButton
                icon={X}
                label={t('Cerrar')}
                onPress={onClose}
                testID={testIDs.agentSheetClose}
                tone="muted"
              />
            </HStack>

            <VStack className="max-h-[48vh] gap-2 overflow-hidden">
              {messages.length === 0 ? (
                <VStack className="gap-2">
                  <Text className="text-sm font-semibold text-foreground">
                    {t('¿Con qué quieres ayuda?')}
                  </Text>
                  {SUGGESTIONS.map((suggestion) => (
                    <Pressable
                      key={suggestion.label}
                      onPress={() => sendMessage(suggestion.prompt)}
                      accessibilityRole="button"
                      accessibilityLabel={suggestion.label}
                      className="min-h-12 justify-center rounded-xl border border-border bg-background px-3 py-2"
                    >
                      <Text className="text-sm text-foreground">{suggestion.label}</Text>
                    </Pressable>
                  ))}
                </VStack>
              ) : (
                <VStack className="gap-2">
                  {messages.slice(-6).map((message) => (
                    <Box
                      key={message.id}
                      className={`max-w-[92%] rounded-2xl px-3 py-2 ${
                        message.role === 'user'
                          ? 'self-end bg-primary'
                          : 'self-start border border-border bg-background'
                      }`}
                    >
                      <Text
                        className={
                          message.role === 'user'
                            ? 'text-sm leading-5 text-primary-foreground'
                            : 'text-sm leading-5 text-foreground'
                        }
                      >
                        {message.text}
                      </Text>
                    </Box>
                  ))}
                  {sending ? (
                    <Text className="text-sm text-muted-foreground">{t('Buscando la respuesta…')}</Text>
                  ) : null}
                </VStack>
              )}
            </VStack>

            {error ? (
              <Text className="text-sm leading-5 text-destructive">{error}</Text>
            ) : null}

            <HStack className="items-end gap-2">
              <Box className="flex-1">
                <Input className="min-h-12 border-border bg-background">
                  <InputField
                    testID={testIDs.agentSheetInput}
                    value={input}
                    onChangeText={setInput}
                    placeholder={t('Escribe tu duda')}
                    className="text-base text-foreground"
                  />
                </Input>
              </Box>
              <AppButton
                testID={testIDs.agentSheetSend}
                loading={sending}
                isDisabled={!input.trim()}
                onPress={() => sendMessage()}
                className="h-12"
              >
                {t('Enviar')}
              </AppButton>
            </HStack>
          </VStack>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function AgentSheetProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const open = useCallback((prompt?: string) => {
    setPendingPrompt(prompt ?? null);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo<AgentSheetState>(
    () => ({ visible, open, close }),
    [close, open, visible],
  );

  return (
    <AgentSheetContext.Provider value={value}>
      {children}
      <AgentSheet
        visible={visible}
        onClose={close}
        initialPrompt={pendingPrompt}
        onPromptConsumed={() => setPendingPrompt(null)}
      />
    </AgentSheetContext.Provider>
  );
}

export function useAgentSheet(): AgentSheetState {
  const value = useContext(AgentSheetContext);
  if (!value) throw new Error('useAgentSheet must be used inside AgentSheetProvider');
  return value;
}
