import React, { useCallback, useEffect, useRef } from 'react';
import { FlatList, type ListRenderItem } from 'react-native';
import { router } from 'expo-router';
import { Banknote, Bookmark, Droplets } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { ActionCard } from '@/components/app/ActionCard';
import { AppAlert } from '@/components/app/AppAlert';
import { Illustration } from '@/components/illustrations/Illustration';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { Disclosure } from '@/components/app/Disclosure';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import { StateView } from '@/components/app/StateView';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Input, InputField } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import type { AgentChatMessage } from '@/providers/AgentProvider';
import { useAgent } from '@/providers/AgentProvider';
import { useOffline } from '@/providers/OfflineProvider';
import { useParcel } from '@/providers/ParcelProvider';

const suggestions = [
  {
    icon: Droplets,
    label: '¿Qué siembro con menos agua?',
    prompt: 'Compara rotaciones que usen menos agua',
    tone: 'water' as const,
  },
  {
    icon: Banknote,
    label: '¿Qué pasa si baja el precio?',
    prompt: 'Simula un precio 15% menor',
    tone: 'earth' as const,
  },
  {
    icon: Bookmark,
    label: 'Guarda un plan',
    prompt: 'Guarda un borrador del plan',
    tone: 'primary' as const,
  },
];

function ChatBubble({
  message,
  onNext,
}: {
  message: AgentChatMessage;
  onNext: (prompt: string) => void;
}) {
  const { t } = useTranslation();
  const isUser = message.role === 'user';
  const nextStep = message.nextStep
    ? {
        datos: { label: t('Completa los datos en Mi parcela'), prompt: null },
        comparar: {
          label: t('Compara 3 planes para tu parcela'),
          prompt: 'Compara mis planes',
        },
        probar: {
          label: t('Prueba con 20% menos agua'),
          prompt: 'Simula 20% menos agua',
        },
        guardar: {
          label: t('Si te sirve, guarda un plan'),
          prompt: 'Guarda un borrador',
        },
        listo: { label: t('Revisa tus planes en Mi parcela'), prompt: null },
      }[message.nextStep.phase]
    : null;
  return (
    <HStack className={isUser ? 'justify-end' : 'justify-start'} style={{ maxWidth: '100%' }}>
      <VStack className={isUser ? 'max-w-[86%] items-end gap-1' : 'max-w-[86%] items-start gap-1'}>
        <Box
          className={[
            'rounded-2xl px-3 py-2',
            isUser
              ? 'rounded-br-sm bg-primary'
              : 'rounded-bl-sm border border-border bg-card',
          ].join(' ')}
        >
          <Text
            className={
              isUser
                ? 'text-base leading-6 text-primary-foreground'
                : 'text-base leading-6 text-foreground'
            }
          >
            {message.text}
          </Text>
        </Box>
        {message.trace?.length ? (
          <Disclosure title={t('Detalles técnicos')}>
            {message.trace.map((trace) => (
              <Text key={`${trace.tool}-${trace.summary}`} className="text-sm text-muted-foreground">
                {trace.tool} · {trace.status} · {trace.summary}
              </Text>
            ))}
          </Disclosure>
        ) : null}
        {nextStep && !isUser ? (
          <Box
            className="w-full gap-2 rounded-2xl border border-border bg-card p-3"
            testID={testIDs.agentNextStep}
          >
            <Text className="text-sm font-semibold uppercase tracking-wider text-primary">
              {t('Siguiente paso')}
            </Text>
            <Text className="text-base leading-6 text-foreground">{nextStep.label}</Text>
            {nextStep.prompt ? (
              <AppButton size="sm" onPress={() => onNext(nextStep.prompt!)}>
                {t('Hacerlo')}
              </AppButton>
            ) : null}
          </Box>
        ) : null}
      </VStack>
    </HStack>
  );
}

function EmptyChat({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const { t } = useTranslation();
  return (
    <VStack className="flex-1 justify-center gap-4 py-6">
      <VStack className="items-center gap-2">
        <Illustration name="agent" size={96} />
        <Text className="text-center text-xl font-semibold text-foreground">
          {t('¿Qué quieres saber?')}
        </Text>
        <Text className="max-w-[320px] text-center text-base leading-6 text-muted-foreground">
          {t('Pregunta con tus palabras. Yo uso los datos de tu parcela.')}
        </Text>
      </VStack>
      <VStack className="gap-3">
        {suggestions.map((suggestion, index) => (
          <ActionCard
            key={suggestion.label}
            icon={suggestion.icon}
            title={t(suggestion.label)}
            tone={suggestion.tone}
            onPress={() => onPrompt(suggestion.prompt)}
            testID={testIDs.agentSuggestion(index)}
          />
        ))}
      </VStack>
    </VStack>
  );
}

export function AgentScreen() {
  const { t } = useTranslation();
  const { parcel } = useParcel();
  const { online, bundle } = useOffline();
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
    ({ item }) => <ChatBubble message={item} onNext={(prompt) => void send(prompt)} />,
    [send],
  );

  if (!parcel) {
    return (
      <Screen header={<AppHeader subtitle={t('Preguntar')} />}>
        <StateView
          illustration="empty"
          title={t('Primero crea tu parcela')}
          description={t('El agente usa los datos de tu parcela para responder.')}
          action={
            <AppButton onPress={() => router.push('/parcel-new')}>
              {t('Crear mi parcela')}
            </AppButton>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll={false}
      keyboard
      header={
        <AppHeader
          subtitle={parcel?.name ?? t('Preguntar')}
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
        ListHeaderComponent={
          !online ? (
            <AppAlert tone="info">
              {bundle
                ? t('Sin conexión: respondo con los datos guardados de tu parcela.')
                : t('Sin conexión: descarga los datos de tu parcela para consultar sin internet.')}
            </AppAlert>
          ) : undefined
        }
        ListEmptyComponent={<EmptyChat onPrompt={(prompt) => void send(prompt)} />}
        ListFooterComponent={
          sending ? (
            <HStack className="items-center gap-2 py-2">
              <Spinner size="small" />
              <Text className="text-sm text-muted-foreground">{t('Buscando la respuesta…')}</Text>
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
            subtitle={t('Confirma antes de guardar.')}
            className="p-3"
          >
            <AppButton testID={testIDs.agentSave} loading={sending} onPress={confirmSave}>
              {t('Confirmar y guardar')}
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
                placeholder={t('Escribe tu pregunta')}
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
