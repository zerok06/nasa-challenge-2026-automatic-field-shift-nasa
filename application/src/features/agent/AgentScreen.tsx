import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, type ListRenderItem } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { Disclosure } from '@/components/app/Disclosure';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import type { AgentChatMessage } from '@/providers/AgentProvider';
import { useAgent } from '@/providers/AgentProvider';
import { useParcel } from '@/providers/ParcelProvider';

const suggestedPrompts = [
  'Compara rotaciones que usen menos agua',
  'Simulá 20% menos agua',
  '¿Por qué la alternativa B?',
  'Guardar un borrador',
];

function ChatBubble({ message }: { message: AgentChatMessage }) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  return (
    <HStack
      className={isUser ? 'justify-end' : 'justify-start'}
      style={{ maxWidth: '100%' }}
    >
      <VStack className={isUser ? 'max-w-[86%] items-end gap-1' : 'max-w-[86%] items-start gap-1'}>
        <Box
          className={[
            'rounded-2xl px-3 py-2',
            isUser
              ? 'rounded-br-sm bg-primary'
              : 'rounded-bl-sm border border-border bg-card',
          ].join(' ')}
        >
          <Text className={isUser ? 'text-sm leading-5 text-primary-foreground' : 'text-sm leading-5 text-foreground'}>
            {message.text}
          </Text>
        </Box>
        {message.trace?.length ? (
          <Disclosure title={t('Trazabilidad de herramientas')}>
            {message.trace.map((trace) => (
              <Text
                key={`${trace.tool}-${trace.summary}`}
                className="text-[11px] text-muted-foreground"
              >
                {trace.tool} · {trace.status} · {trace.summary}
              </Text>
            ))}
          </Disclosure>
        ) : null}
        {message.actions?.length ? (
          <Text size="xs" className="text-muted-foreground">
            {t('Acciones: {{actions}}', {
              actions: message.actions.map((action) => action.action).join(', '),
            })}
          </Text>
        ) : null}
      </VStack>
    </HStack>
  );
}

function EmptyChat({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const { t } = useTranslation();
  return (
    <VStack className="flex-1 items-center justify-center gap-3 py-8">
      <Text className="text-center text-lg font-semibold text-foreground">
        {t('Preguntale al agente')}
      </Text>
      <Text className="max-w-[300px] text-center text-sm leading-5 text-muted-foreground">
        {t(
          'Puede comparar rotaciones, simular agua o precio, explicar una recomendación y preparar un borrador con confirmación humana.',
        )}
      </Text>
      <VStack className="w-full gap-2 pt-2">
        {suggestedPrompts.map((prompt) => (
          <AppButton
            key={prompt}
            tone="outline"
            size="sm"
            onPress={() => onPrompt(prompt)}
          >
            {t(prompt)}
          </AppButton>
        ))}
      </VStack>
    </VStack>
  );
}

export function AgentScreen() {
  const { t } = useTranslation();
  const { parcel } = useParcel();
  const {
    messages,
    input,
    setInput,
    sending,
    proposalId,
    savedMessage,
    error,
    send,
    confirmSave,
  } = useAgent();
  const listRef = useRef<FlatList<AgentChatMessage>>(null);

  useEffect(() => {
    if (messages.length > 0) {
      const timeout = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      return () => clearTimeout(timeout);
    }
  }, [messages.length]);

  const renderItem = useCallback<ListRenderItem<AgentChatMessage>>(
    ({ item }) => <ChatBubble message={item} />,
    [],
  );

  return (
    <Screen
      scroll={false}
      keyboard
      header={
        <AppHeader
          subtitle={parcel?.name ?? t('Agente Anden')}
          isSimulated={parcel?.is_simulated}
          onSources={() => router.push('/sources')}
        />
      }
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 8,
          gap: 12,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={<EmptyChat onPrompt={(prompt) => void send(prompt)} />}
        ListFooterComponent={
          sending ? (
            <HStack className="items-center gap-2 py-2">
              <Spinner size="small" />
              <Text size="xs" className="text-muted-foreground">
                {t('El agente está pensando…')}
              </Text>
            </HStack>
          ) : undefined
        }
      />

      <VStack className="gap-2 border-t border-border bg-card px-4 pb-3 pt-2">
        {error ? <AppAlert tone="error">{error}</AppAlert> : null}
        {savedMessage ? <AppAlert tone="success">{savedMessage}</AppAlert> : null}
        {proposalId ? (
          <SectionCard
            title={t('Borrador listo')}
            subtitle={t('El agente necesita tu confirmación antes de guardar.')}
            className="p-3"
          >
            <AppButton
              testID={testIDs.agentSave}
              loading={sending}
              onPress={confirmSave}
            >
              {t('Confirmar y guardar borrador')}
            </AppButton>
          </SectionCard>
        ) : null}
        <HStack className="items-end gap-2">
          <Box className="flex-1">
            <Input className="h-12 border-border bg-background">
              <InputField
                testID={testIDs.agentInput}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={() => void send()}
                returnKeyType="send"
                blurOnSubmit
                placeholder={t('Escribí tu pregunta')}
                className="text-base text-foreground"
              />
            </Input>
          </Box>
          <AppButton
            testID={testIDs.agentSend}
            loading={sending}
            isDisabled={!input.trim()}
            onPress={() => void send()}
            className="h-12"
          >
            {t('Enviar')}
          </AppButton>
        </HStack>
      </VStack>
    </Screen>
  );
}
