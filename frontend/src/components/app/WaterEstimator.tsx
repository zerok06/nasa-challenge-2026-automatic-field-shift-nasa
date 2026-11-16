/**
 * WaterEstimator — the honest water capture: four ways a farmer can describe
 * the same volume, a visible conversion to m³ and mm, and an explicit
 * "No sé" path that records the gap instead of inventing a number.
 *
 * The component only computes and validates. The page owns the API write, the
 * offline outbox and the toast, so every entry follows the same path.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';
import { AppAlert } from './Feedback';
import { AppButton } from './AppButton';
import { NumberField, SelectField } from './FormField';
import { formatNumber } from '../../lib/format';
import {
  emptyWaterInputs,
  estimateWater,
  type WaterEstimate,
  type WaterInputs,
  type WaterMode,
  type WaterTurnBasis,
} from '../../lib/units';

const WATER_MODES: { value: WaterMode; label: string }[] = [
  { value: 'turnos', label: 'Turnos' },
  { value: 'horas', label: 'Horas de riego' },
  { value: 'recibo', label: 'Recibo o medidor' },
  { value: 'mm', label: 'Milímetros (mm)' },
];

const EFFICIENCY_OPTIONS = [
  { value: '', label: 'No sé' },
  { value: '0.5', label: '50 %' },
  { value: '0.6', label: '60 %' },
  { value: '0.7', label: '70 %' },
  { value: '0.8', label: '80 %' },
  { value: '0.9', label: '90 %' },
] as const;

export function WaterEstimator({
  areaHa,
  savingEstimate = false,
  savingUnknown = false,
  onSave,
  onSaveUnknown,
}: {
  areaHa: number | null;
  savingEstimate?: boolean;
  savingUnknown?: boolean;
  onSave: (estimate: WaterEstimate, efficiency: number | null) => void;
  onSaveUnknown: () => void;
}) {
  const { t } = useTranslation();
  const [inputs, setInputs] = useState<WaterInputs>(() => emptyWaterInputs());
  const [efficiency, setEfficiency] = useState('');

  const update = (patch: Partial<WaterInputs>) =>
    setInputs((current) => ({ ...current, ...patch }));

  const estimate = estimateWater(inputs, areaHa);
  const efficiencyValue = efficiency ? Number(efficiency) : null;

  const areaLabel = areaHa !== null ? formatNumber(areaHa, '', 2) : '';

  return (
    <div className="space-y-3">
      <p className="text-sm leading-5 text-muted-foreground">
        {t('Anota el agua como la conoces. Lo pasamos a m³ y mm antes de guardar.')}
      </p>

      <div
        role="group"
        aria-label={t('¿Cómo mides tu agua?')}
        className="grid grid-cols-2 gap-2"
      >
        {WATER_MODES.map((mode) => {
          const selected = inputs.mode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              aria-pressed={selected}
              onClick={() => update({ mode: mode.value })}
              className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-primary bg-accent text-primary'
                  : 'border-border bg-card text-foreground hover:bg-primary-50'
              }`}
            >
              {t(mode.label)}
            </button>
          );
        })}
      </div>

      {inputs.mode === 'turnos' ? (
        <>
          <NumberField
            label={t('¿Cuántos turnos tienes en la campaña?')}
            value={inputs.turns}
            onValueChange={(turns) => update({ turns })}
            placeholder={t('Ej. 6')}
          />
          <SelectField<WaterTurnBasis>
            label={t('¿Cómo sabes el agua de un turno?')}
            value={inputs.turnBasis}
            onValueChange={(turnBasis) => update({ turnBasis })}
            options={[
              { value: 'm3', label: t('Sé los m³ por turno') },
              { value: 'flow', label: t('Sé los L/s y las horas') },
            ]}
          />
          {inputs.turnBasis === 'flow' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberField
                label={t('¿Qué caudal sale? (litros por segundo)')}
                hint={t('1 litro por segundo = 3,6 m³ por hora.')}
                value={inputs.flowLs}
                onValueChange={(flowLs) => update({ flowLs })}
                placeholder={t('Ej. 2')}
                suffix="L/s"
              />
              <NumberField
                label={t('¿Cuántas horas dura el turno?')}
                value={inputs.hoursPerTurn}
                onValueChange={(hoursPerTurn) => update({ hoursPerTurn })}
                placeholder={t('Ej. 4')}
                suffix="h"
              />
            </div>
          ) : (
            <NumberField
              label={t('¿Cuántos m³ te dan por turno?')}
              hint={t('Está en tu recibo o pregúntalo a tu comité de regantes.')}
              value={inputs.m3PerTurn}
              onValueChange={(m3PerTurn) => update({ m3PerTurn })}
              placeholder={t('Ej. 120')}
              suffix="m³"
            />
          )}
        </>
      ) : null}

      {inputs.mode === 'horas' ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label={t('¿Cuántas horas riegas por semana?')}
              hint={t('Solo las horas con agua corriendo.')}
              value={inputs.hoursPerWeek}
              onValueChange={(hoursPerWeek) => update({ hoursPerWeek })}
              placeholder={t('Ej. 3')}
              suffix="h/sem"
            />
            <NumberField
              label={t('¿Qué caudal sale? (litros por segundo)')}
              hint={t('1 litro por segundo = 3,6 m³ por hora.')}
              value={inputs.flowLs}
              onValueChange={(flowLs) => update({ flowLs })}
              placeholder={t('Ej. 2')}
              suffix="L/s"
            />
          </div>
          <NumberField
            label={t('¿Cuántas semanas riegas en la campaña?')}
            value={inputs.weeks}
            onValueChange={(weeks) => update({ weeks })}
            placeholder={t('Ej. 20')}
            suffix="sem"
          />
        </>
      ) : null}

      {inputs.mode === 'recibo' ? (
        <NumberField
          label={t('¿Cuántos m³ dice tu recibo o medidor?')}
          hint={t('El total de la campaña, no el de un solo mes.')}
          value={inputs.meterM3}
          onValueChange={(meterM3) => update({ meterM3 })}
          placeholder={t('Ej. 1500')}
          suffix="m³"
        />
      ) : null}

      {inputs.mode === 'mm' ? (
        <NumberField
          label={t('Milímetros por campaña')}
          hint={t('1 mm = 10 m³ por hectárea.')}
          value={inputs.mm}
          onValueChange={(mm) => update({ mm })}
          placeholder={t('Ej. 1200')}
          suffix="mm"
        />
      ) : null}

      {estimate ? (
        <AppAlert tone="info">
          {estimate.m3 !== null && estimate.mm !== null
            ? inputs.mode === 'mm'
              ? t(
                  '≈ {{mm}} mm ≈ {{m3}} m³ en tu parcela de {{ha}} ha. Revísalo antes de guardar.',
                  {
                    mm: formatNumber(estimate.mm, '', 1),
                    m3: formatNumber(estimate.m3, '', 0),
                    ha: areaLabel,
                  },
                )
              : t(
                  '≈ {{m3}} m³ ≈ {{mm}} mm en tu parcela de {{ha}} ha. Revísalo antes de guardar.',
                  {
                    m3: formatNumber(estimate.m3, '', 0),
                    mm: formatNumber(estimate.mm, '', 1),
                    ha: areaLabel,
                  },
                )
            : inputs.mode === 'mm'
              ? t('≈ {{mm}} mm. Sin superficie no puedo pasarlo a m³.', {
                  mm: formatNumber(estimate.mm, '', 1),
                })
              : t('≈ {{m3}} m³ en total. Sin superficie no puedo pasarlo a mm.', {
                  m3: formatNumber(estimate.m3, '', 0),
                })}
        </AppAlert>
      ) : (
        <p className="text-sm leading-5 text-muted-foreground">
          {t('Completa los números para calcular tu agua.')}
        </p>
      )}

      <SelectField
        label={t('¿Qué tan eficiente es tu riego?')}
        value={efficiency}
        onValueChange={setEfficiency}
        options={EFFICIENCY_OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.label),
        }))}
        hint={t('Opcional. Se guarda como referencia; no cambia el agua que calculaste.')}
      />

      <AppButton
        fullWidth
        loading={savingEstimate}
        disabled={!estimate}
        onClick={() => {
          if (estimate) onSave(estimate, efficiencyValue);
        }}
      >
        {t('Guardar esta estimación')}
      </AppButton>
      <AppButton
        tone="secondary"
        fullWidth
        icon={HelpCircle}
        loading={savingUnknown}
        onClick={onSaveUnknown}
      >
        {t('No sé cuánta agua uso: guardar así')}
      </AppButton>
      <p className="text-sm leading-5 text-muted-foreground">
        {t(
          'Puedes mirar tu recibo de agua o preguntar a tu comité de regantes. Si no sabes la cantidad, usa “No sé”: lo guardamos así y no inventamos un número.',
        )}
      </p>
    </div>
  );
}
