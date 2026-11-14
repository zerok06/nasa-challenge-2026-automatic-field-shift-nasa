import React, { useState } from 'react';
import { Check } from 'lucide-react-native';
import { router } from 'expo-router';

import { AppAlert } from '@/components/app/AppAlert';
import { AppButton } from '@/components/app/AppButton';
import { AppHeader } from '@/components/app/AppHeader';
import { FormField } from '@/components/app/FormField';
import { Screen } from '@/components/app/Screen';
import { SectionCard } from '@/components/app/SectionCard';
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
  CheckboxLabel,
} from '@/components/ui/checkbox';
import { HStack } from '@/components/ui/hstack';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { testIDs } from '@/design-system/testIDs';
import { useParcel } from '@/providers/ParcelProvider';

function CheckIcon(props: { size?: number; color?: string }) {
  return <Check {...props} />;
}

export function OnboardingScreen() {
  const { createDemo, createParcel } = useParcel();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Mi parcela');
  const [area, setArea] = useState('1.2');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      await createDemo();
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la parcela demo');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Escribí un nombre para la parcela');
      return;
    }
    if (!consent) {
      setError('Necesitamos tu consentimiento para continuar');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createParcel({
        name: name.trim(),
        areaHa: Number(area) > 0 ? Number(area) : null,
        lat: -17.19,
        lon: -70.93,
      });
      router.replace('/');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear la parcela');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboard
      edges={['top', 'bottom']}
      header={<AppHeader subtitle="Copiloto de planificación agrícola" />}
    >
      <VStack className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Paso {step + 1} de 2
        </Text>
        <Progress value={step === 0 ? 50 : 100}>
          <ProgressFilledTrack className="bg-primary" />
        </Progress>
      </VStack>

      {step === 0 ? (
        <>
          <VStack className="gap-2">
            <Text className="text-3xl font-bold leading-9 tracking-tight text-foreground">
              Tu parcela, tus decisiones, más información.
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              Automatic reúne datos NASA, tu historial y tus restricciones para comparar
              rotaciones con evidencia y sin inventar datos.
            </Text>
          </VStack>

          <SectionCard
            title="Parcela de demostración"
            subtitle="Datos sintéticos etiquetados: cebolla → zapallo, agua declarada y sin análisis de suelo."
          >
            <AppButton
              testID={testIDs.onboardingDemo}
              loading={busy}
              onPress={handleDemo}
            >
              Cargar parcela demo
            </AppButton>
            <AppButton
              testID={testIDs.onboardingNext}
              tone="outline"
              onPress={() => setStep(1)}
            >
              Crear mi parcela
            </AppButton>
          </SectionCard>

          <AppAlert tone="info">
            No es una recomendación agronómica certificada. Las cifras faltantes se muestran como
            “No disponible”, nunca como cero.
          </AppAlert>
        </>
      ) : (
        <>
          <VStack className="gap-2">
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              Contanos sobre tu parcela
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              Con estos datos podemos ubicar el contexto NASA y estimar agua, suelo y margen.
            </Text>
          </VStack>

          <SectionCard title="Datos de la parcela">
            <FormField
              label="Nombre"
              testID={testIDs.onboardingName}
              value={name}
              onChangeText={setName}
              placeholder="Mi parcela"
              required
            />
            <FormField
              label="Superficie (ha, opcional)"
              testID={testIDs.onboardingArea}
              value={area}
              onChangeText={setArea}
              placeholder="1.2"
              keyboardType="decimal-pad"
              helper="Si no la sabés, podés dejarla vacía. No vamos a inventarla."
            />
            <HStack className="items-start gap-3 pt-1">
              <Checkbox
                value="consent"
                isChecked={consent}
                onChange={setConsent}
                aria-label="Aceptar consentimiento del piloto"
              >
                <CheckboxIndicator>
                  <CheckboxIcon as={CheckIcon as any} />
                </CheckboxIndicator>
                <CheckboxLabel className="text-sm leading-5 text-foreground">
                  Acepto el consentimiento del piloto: datos mínimos, borrado/exportación y uso
                  gratuito.
                </CheckboxLabel>
              </Checkbox>
            </HStack>
          </SectionCard>

          {error ? <AppAlert tone="error">{error}</AppAlert> : null}

          <AppButton
            testID={testIDs.onboardingCreate}
            loading={busy}
            onPress={handleCreate}
            isDisabled={!consent}
          >
            Crear parcela
          </AppButton>
          <AppButton tone="ghost" onPress={() => setStep(0)}>
            Volver
          </AppButton>
        </>
      )}

      {step === 0 && error ? <AppAlert tone="error">{error}</AppAlert> : null}
      <Text className="text-center text-xs leading-4 text-muted-foreground">
        Automatic · piloto Moquegua · datos abiertos NASA · app gratuita
      </Text>
    </Screen>
  );
}
