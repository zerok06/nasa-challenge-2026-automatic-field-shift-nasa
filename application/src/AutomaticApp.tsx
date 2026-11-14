import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button as PaperButton, Card, Text } from 'react-native-paper';
import { Colors } from './theme';

import {
  AgentAction,
  AgentMessage,
  Comparison,
  Context,
  IndicatorResponse,
  Parcel,
  Plan,
  apiBaseUrl,
  confirmAction,
  createComparison,
  createDemoParcel,
  createParcel as createParcelApi,
  createThread,
  ensureSession,
  getComparison,
  getContext,
  getIndicators,
  getParcels,
  sendAgentMessage,
  simulate,
} from './api';
import { MapView } from './MapView';

type PaperButtonProps = Omit<React.ComponentProps<typeof PaperButton>, 'children'> & {
  label?: string;
  children?: React.ReactNode;
};

function Button({ label, children, ...props }: PaperButtonProps) {
  return (
    <PaperButton mode="contained" {...props}>
      {label ?? children}
    </PaperButton>
  );
}
type Screen = 'onboarding' | 'dashboard' | 'map' | 'comparison' | 'scenario' | 'agent' | 'sources';

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  trace?: AgentMessage['tool_trace'];
  actions?: AgentAction[];
};

function fmt(value: number | null | undefined, unit = ''): string {
  if (value === null || value === undefined) return 'No disponible';
  return `${Number(value).toFixed(2)}${unit ? ` ${unit}` : ''}`;
}

function fmtMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'No calculable';
  return `S/ ${Number(value).toFixed(2)}`;
}

function statusLabel(status: string): string {
  if (status === 'eligible') return 'Elegible';
  if (status === 'invalid') return 'No viable';
  if (status === 'needs_review') return 'Revisar';
  return status;
}

function EvidenceBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'warn' | 'ok' }) {
  const color = tone === 'ok' ? Colors.success : tone === 'warn' ? Colors.warning : Colors.unknown;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Header({ parcel, onSources }: { parcel: Parcel | null; onSources?: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.brand}>AUTOMATIC</Text>
        <Text style={styles.headerSubtitle}>
          {parcel ? parcel.name : 'Copiloto de planificación agrícola'}
        </Text>
      </View>
      {parcel?.is_simulated ? <EvidenceBadge label="DEMO" tone="warn" /> : null}
      {onSources ? (
        <TouchableOpacity onPress={onSources} testID="dashboard.sources">
          <Text style={styles.link}>Fuentes</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  const items: { key: Screen; label: string; testID: string }[] = [
    { key: 'dashboard', label: 'Inicio', testID: 'nav.home' },
    { key: 'map', label: 'Mapa', testID: 'nav.map' },
    { key: 'comparison', label: 'Rotaciones', testID: 'nav.rotations' },
    { key: 'agent', label: 'Agente', testID: 'nav.agent' },
  ];
  return (
    <View style={styles.nav}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.key}
          testID={item.testID}
          onPress={() => onNavigate(item.key)}
          style={[styles.navItem, screen === item.key && styles.navItemActive]}
        >
          <Text style={[styles.navText, screen === item.key && styles.navTextActive]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PlanCard({ plan, index }: { plan: Plan; index: number }) {
  return (
    <Card style={styles.card} testID={`comparison.plan.${index}`}>
      <View style={styles.planHeader}>
        <Text style={styles.cardTitle}>{plan.label}</Text>
        <EvidenceBadge label={statusLabel(plan.status)} tone={plan.status === 'invalid' ? 'warn' : 'neutral'} />
      </View>
      <Text style={styles.sequence}>{plan.crop_sequence.join(' → ')}</Text>
      <Row label="Riego bruto" value={fmt(plan.water.gross_irrigation_mm, 'mm')} />
      <Row label="Déficit" value={fmt(plan.water.deficit_mm, 'mm')} />
      <Row label="Factibilidad" value={plan.water.feasibility} />
      <Row label="Margen" value={fmtMoney(plan.economics.margin_pen)} />
      <Row label="Suelo" value={plan.soil.fertility_status === 'not_measured' ? 'Por verificar' : plan.soil.fertility_status} />
      {plan.missing_inputs.length > 0 ? (
        <Text style={styles.missing}>Falta: {plan.missing_inputs.join(', ')}</Text>
      ) : null}
      {plan.why_this_plan.map((why) => (
        <Text key={why} style={styles.why}>• {why}</Text>
      ))}
    </Card>
  );
}

export default function AutomaticApp() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [context, setContext] = useState<Context | null>(null);
  const [indicators, setIndicators] = useState<IndicatorResponse | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [scenario, setScenario] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [agentInput, setAgentInput] = useState('');
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<'imerg' | 'ndvi'>('imerg');
  const [mapDate, setMapDate] = useState('2024-06-01');
  const [formName, setFormName] = useState('Mi parcela');
  const [formArea, setFormArea] = useState('1.2');

  const selectParcel = useCallback(async (next: Parcel) => {
    setBusy(true);
    setError(null);
    try {
      const [ctx, ind] = await Promise.all([getContext(next.id), getIndicators(next.id)]);
      setParcel(next);
      setContext(ctx);
      setIndicators(ind);
      setComparison(null);
      setScenario(null);
      setScreen('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la parcela');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await ensureSession();
        const parcels = await getParcels();
        if (parcels.length > 0) {
          await selectParcel(parcels[0]);
        } else {
          setScreen('onboarding');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'API no disponible');
        setScreen('onboarding');
      } finally {
        setReady(true);
      }
    })();
  }, [selectParcel]);

  const handleDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const demo = await createDemoParcel();
      await selectParcel(demo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la parcela demo');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await createParcelApi({
        name: formName || 'Mi parcela',
        areaHa: Number(formArea) > 0 ? Number(formArea) : null,
        lat: -17.19,
        lon: -70.93,
      });
      await selectParcel(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la parcela');
    } finally {
      setBusy(false);
    }
  };

  const handleCompare = async () => {
    if (!parcel) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createComparison(parcel.id);
      setComparison(result);
      setScreen('comparison');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo comparar');
    } finally {
      setBusy(false);
    }
  };

  const handleSimulate = async (water = 1, price = 1) => {
    if (!comparison) return;
    if (water === 1 && price === 1) {
      setScenario(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await simulate(comparison.comparison_id, water, price);
      setScenario(result);
      setScreen('scenario');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo simular');
    } finally {
      setBusy(false);
    }
  };

  const ensureThread = async (): Promise<string> => {
    if (threadId) return threadId;
    if (!parcel) throw new Error('No hay parcela');
    const thread = await createThread(parcel.id);
    setThreadId(thread.thread_id);
    return thread.thread_id;
  };

  const handleSend = async () => {
    if (!agentInput.trim() || !parcel) return;
    const text = agentInput.trim();
    setAgentInput('');
    setChat((prev) => [...prev, { role: 'user', text }]);
    setBusy(true);
    setError(null);
    try {
      const id = await ensureThread();
      const response = await sendAgentMessage(id, text);
      setChat((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.answer,
          trace: response.tool_trace,
          actions: response.ui_actions,
        },
      ]);
      const saveAction = response.ui_actions.find((a) => a.action === 'save_plan_draft');
      if (saveAction?.payload?.proposal_id) {
        setProposalId(String(saveAction.payload.proposal_id));
      }
      const openAction = response.ui_actions.find((a) => a.action === 'open_comparison');
      if (openAction?.payload?.comparison_id) {
        const existing = await getComparison(String(openAction.payload.comparison_id));
        setComparison(existing);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'El agente no respondió');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!proposalId) return;
    setBusy(true);
    setError(null);
    try {
      await confirmAction(proposalId, true);
      setSavedMessage('Borrador guardado con estado draft.');
      setProposalId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const mapPoint = useMemo(() => {
    if (!parcel) return { lat: -17.19, lon: -70.93 };
    const geometry = parcel.geometry as { type: string; coordinates: any };
    if (geometry.type === 'Point') {
      return { lat: Number(geometry.coordinates[1]), lon: Number(geometry.coordinates[0]) };
    }
    const first = geometry.coordinates?.[0]?.[0];
    return first ? { lat: Number(first[1]), lon: Number(first[0]) } : { lat: -17.19, lon: -70.93 };
  }, [parcel]);

  const firstIndicator = indicators?.indicators?.[0];

  const renderOnboarding = () => (
    <View style={styles.page}>
      <Text style={styles.hero}>Tu parcela, tus decisiones, más información.</Text>
      <Text style={styles.body}>
        Automatic reúne datos NASA, tu historial y tus restricciones para comparar rotaciones.
        Empezá con una parcela sintética o creá la tuya.
      </Text>
      <Card style={styles.card}>
        <CardTitle>Parcela de demostración</CardTitle>
        <Text style={styles.body}>
          Datos sintéticos etiquetados: cebolla → zapallo, agua declarada y sin análisis de suelo.
        </Text>
        <Button
          label="Cargar parcela demo"
          testID="onboarding.demo"
          onPress={handleDemo}
          disabled={busy}
          buttonColor={Colors.primary}
          style={styles.button}
        />
      </Card>
      <Card style={styles.card}>
        <CardTitle>Crear mi parcela</CardTitle>
        <Text style={styles.label}>Nombre</Text>
        <TextInput
          value={formName}
          onChangeText={setFormName}
          style={styles.input}
          placeholder="Mi parcela"
          testID="onboarding.name"
        />
        <Text style={styles.label}>Superficie (ha, opcional)</Text>
        <TextInput
          value={formArea}
          onChangeText={setFormArea}
          style={styles.input}
          keyboardType="decimal-pad"
          placeholder="1.2"
          testID="onboarding.area"
        />
        <Button
          label="Crear parcela"
          testID="onboarding.create"
          onPress={handleCreate}
          disabled={busy}
          buttonColor={Colors.primaryDark}
          style={styles.button}
        />
      </Card>
      <Text style={styles.caption}>
        Al continuar aceptás el consentimiento del piloto: datos mínimos, borrado/exportación y
        uso gratuito. No es una recomendación agronómica certificada.
      </Text>
    </View>
  );

  const renderDashboard = () => (
    <View style={styles.page}>
      <Card style={styles.card}>
        <CardTitle>Ficha de parcela</CardTitle>
        <Row label="Superficie" value={parcel?.area_ha ? `${parcel.area_ha} ha` : 'No disponible'} />
        <Row label="Distrito" value={parcel?.district ?? 'No disponible'} />
        <Row label="Comparación" value={context?.completeness.comparison ?? '—'} />
        <Row label="Agua" value={context?.completeness.water ?? '—'} />
        {context?.missing_inputs.length ? (
          <Text style={styles.missing}>Falta: {context.missing_inputs.join(', ')}</Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <CardTitle>Contexto NASA</CardTitle>
        <Row label="Lluvia" value={fmt(firstIndicator?.precip_mm, 'mm')} />
        <Row label="Tmin" value={fmt(firstIndicator?.tmin_c, '°C')} />
        <Row label="Tmax" value={fmt(firstIndicator?.tmax_c, '°C')} />
        <Row label="ETo" value={fmt(firstIndicator?.eto_mm, 'mm')} />
        <Text style={styles.caption}>
          {indicators?.source?.source ?? 'NASA POWER'} · {indicators?.source?.resolution ?? '—'} ·{' '}
          {indicators?.source?.quality_flag ?? 'estimated'}
        </Text>
        <Button
          label="Ver ficha de fuentes"
          testID="dashboard.sources"
          onPress={() => setScreen('sources')}
          buttonColor={Colors.secondary}
          style={styles.button}
        />
      </Card>

      <Button
        label="Comparar rotaciones"
        testID="dashboard.compare"
        onPress={handleCompare}
        disabled={busy}
        buttonColor={Colors.primary}
        style={styles.button}
      />
      <Button
        label="Ver mapa"
        testID="dashboard.map"
        onPress={() => setScreen('map')}
        buttonColor={Colors.water}
        style={styles.button}
      />
      <Button
        label="Preguntar al agente"
        testID="dashboard.agent"
        onPress={() => setScreen('agent')}
        buttonColor={Colors.secondary}
        style={styles.button}
      />
    </View>
  );

  const renderMap = () => (
    <View style={styles.page}>
      <View style={styles.chips}>
        <Button
          label="IMERG"
          testID="map.layer.imerg"
          compact
          onPress={() => setMapLayer('imerg')}
          buttonColor={mapLayer === 'imerg' ? Colors.primary : Colors.unknown}
          style={styles.chip}
        />
        <Button
          label="NDVI"
          testID="map.layer.ndvi"
          compact
          onPress={() => setMapLayer('ndvi')}
          buttonColor={mapLayer === 'ndvi' ? Colors.primary : Colors.unknown}
          style={styles.chip}
        />
      </View>
      <View style={styles.mapBox}>
        <MapView
          lat={mapPoint.lat}
          lon={mapPoint.lon}
          name={parcel?.name ?? 'Parcela'}
          layer={mapLayer}
          date={mapDate}
        />
      </View>
      {mapLayer === 'ndvi' ? (
        <Card style={styles.card} testID="map.ndvi.dates">
          <CardTitle>Fecha de la capa NDVI</CardTitle>
          <View style={styles.chips}>
            <Button
              label="Jun 2024"
              testID="map.ndvi.dateA"
              compact
              onPress={() => setMapDate('2024-06-01')}
              buttonColor={mapDate === '2024-06-01' ? Colors.primary : Colors.unknown}
              style={styles.chip}
            />
            <Button
              label="Sep 2024"
              testID="map.ndvi.dateB"
              compact
              onPress={() => setMapDate('2024-09-01')}
              buttonColor={mapDate === '2024-09-01' ? Colors.primary : Colors.unknown}
              style={styles.chip}
            />
          </View>
          <Text style={styles.caption}>
            Comparación visual A/B; no implica causalidad ni diagnóstico.
          </Text>
        </Card>
      ) : null}
      <Card style={styles.card} testID="map.legend">
        <CardTitle>{mapLayer === 'imerg' ? 'Precipitación IMERG' : 'NDVI VIIRS'}</CardTitle>
        <Text style={styles.caption}>NASA GIBS · {mapDate} · contexto regional</Text>
        <Text style={styles.caption}>
          {mapLayer === 'imerg' ? '0,1° (~11 km) · solo hasta zoom 6' : '~0,5–1 km · solo hasta zoom 7'}
        </Text>
        <Text style={styles.body}>No es una medición de tu parcela.</Text>
        {mapLayer === 'ndvi' ? (
          <Text style={styles.caption}>
            NDVI es un índice de vegetación; no diagnostica nutrientes ni enfermedades.
          </Text>
        ) : null}
      </Card>
    </View>
  );

  const renderComparison = () => (
    <View style={styles.page}>
      {!comparison ? (
        <Card style={styles.card}>
          <CardTitle>Comparador de rotaciones</CardTitle>
          <Text style={styles.body}>
            Generá 3 estrategias: la actual y dos alternativas, en el mismo horizonte.
          </Text>
          <Button
            label="Comparar ahora"
            testID="comparison.create"
            onPress={handleCompare}
            disabled={busy}
            buttonColor={Colors.primary}
            style={styles.button}
          />
        </Card>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Comparación</Text>
          <Text style={styles.caption}>
            {comparison.analysis_period.start} → {comparison.analysis_period.end} ·{' '}
            {comparison.source_snapshots.join(', ') || 'sin snapshot'}
          </Text>
          {comparison.plans.map((plan, index) => (
            <PlanCard key={plan.plan_id} plan={plan} index={index} />
          ))}
          <Text style={styles.disclaimer}>{comparison.disclaimer}</Text>
          <Button
            label="Simular cambios"
            testID="comparison.simulate"
            onPress={() => setScreen('scenario')}
            buttonColor={Colors.water}
            style={styles.button}
          />
        </>
      )}
    </View>
  );

  const renderScenario = () => (
    <View style={styles.page}>
      <Card style={styles.card}>
        <CardTitle>Laboratorio de escenarios</CardTitle>
        <Text style={styles.body}>
          Cambiá una variable a la vez. El baseline no se modifica.
        </Text>
        <View style={styles.chips}>
          <Button
            label="Agua −20%"
            testID="scenario.water.preset20"
            compact
            onPress={() => handleSimulate(0.8, 1)}
            disabled={!comparison || busy}
            buttonColor={Colors.water}
            style={styles.chip}
          />
          <Button
            label="Precio −15%"
            testID="scenario.price.preset15"
            compact
            onPress={() => handleSimulate(1, 0.85)}
            disabled={!comparison || busy}
            buttonColor={Colors.secondary}
            style={styles.chip}
          />
          <Button
            label="Restablecer"
            testID="scenario.reset"
            compact
            onPress={() => {
              setScenario(null);
              setScreen('comparison');
            }}
            buttonColor={Colors.unknown}
            style={styles.chip}
          />
        </View>
        {scenario ? (
          <View testID="scenario.result">
            <Text style={styles.sectionTitle}>Resultado simulado</Text>
            <Text style={styles.caption}>Tipo: {scenario.scenario_type}</Text>
            {scenario.plans.map((plan) => (
              <View key={plan.plan_id} style={styles.scenarioRow}>
                <Text style={styles.rowLabel}>{plan.label}</Text>
                <Text style={styles.rowValue}>
                  déficit {fmt(plan.water.deficit_mm, 'mm')} · margen {fmtMoney(plan.economics.margin_pen)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.caption}>Elegí un preset para recalcular.</Text>
        )}
      </Card>
    </View>
  );

  const renderAgent = () => (
    <View style={styles.page}>
      <Card style={styles.card}>
        <CardTitle>Agente Automatic</CardTitle>
        <Text style={styles.caption}>
          Preguntá “compara rotaciones”, “simula menos agua”, “¿por qué?” o “guardar”.
        </Text>
        <View style={styles.chat}>
          {chat.length === 0 ? (
            <Text style={styles.caption}>Todavía no hay mensajes.</Text>
          ) : (
            chat.map((message, index) => (
              <View
                key={`${message.role}-${index}`}
                style={[styles.bubble, message.role === 'user' ? styles.userBubble : styles.agentBubble]}
              >
                <Text style={styles.bubbleText}>{message.text}</Text>
                {message.trace?.map((trace) => (
                  <Text key={trace.tool} style={styles.trace}>
                    {trace.tool} · {trace.status} · {trace.summary}
                  </Text>
                ))}
                {message.actions?.map((action) => (
                  <Text key={action.action} style={styles.trace}>
                    acción: {action.action}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
        <TextInput
          value={agentInput}
          onChangeText={setAgentInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          blurOnSubmit
          style={styles.input}
          placeholder="Escribí tu pregunta"
          testID="agent.input"
        />
        <Button
          label="Enviar"
          testID="agent.send"
          onPress={handleSend}
          disabled={busy || !agentInput.trim()}
          buttonColor={Colors.primary}
          style={styles.button}
        />
        {proposalId ? (
          <Button
            label="Confirmar y guardar borrador"
            testID="agent.save"
            onPress={handleConfirmSave}
            disabled={busy}
            buttonColor={Colors.warning}
            style={styles.button}
          />
        ) : null}
        {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}
      </Card>
    </View>
  );

  const renderSources = () => (
    <View style={styles.page}>
      <Card style={styles.card}>
        <CardTitle>Transparencia y fuentes</CardTitle>
        <Row label="Snapshot" value={indicators?.source?.snapshot_id ?? 'No disponible'} />
        <Row label="Fuente" value={indicators?.source?.source ?? 'NASA POWER'} />
        <Row label="Resolución" value={indicators?.source?.resolution ?? '—'} />
        <Row label="Calidad" value={indicators?.source?.quality_flag ?? '—'} />
        <Row label="Actualizado" value={indicators?.source?.retrieved_at ?? '—'} />
        <Row label="Simulado" value={indicators?.source?.is_simulated ? 'Sí' : 'No'} />
        <Text style={styles.caption}>
          IMERG/NDVI se muestran con NASA GIBS; son contexto regional, no medición de parcela.
        </Text>
        <Button
          label="Volver"
          onPress={() => setScreen('dashboard')}
          buttonColor={Colors.primary}
          style={styles.button}
        />
      </Card>
    </View>
  );

  const content = (() => {
    if (!ready) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.caption}>Iniciando sesión y cargando datos…</Text>
        </View>
      );
    }
    if (screen === 'onboarding') return renderOnboarding();
    if (screen === 'dashboard') return renderDashboard();
    if (screen === 'map') return renderMap();
    if (screen === 'comparison') return renderComparison();
    if (screen === 'scenario') return renderScenario();
    if (screen === 'agent') return renderAgent();
    return renderSources();
  })();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Header parcel={parcel} onSources={parcel ? () => setScreen('sources') : undefined} />
      {error ? (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {busy ? <View style={styles.progressBar} /> : null}
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {content}
        <Text style={styles.api}>API: {apiBaseUrl()}</Text>
      </ScrollView>
      {parcel ? <BottomNav screen={screen} onNavigate={setScreen} /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingBottom: 24 },
  page: { padding: 16, gap: 12 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerText: { flex: 1 },
  brand: { fontSize: 18, fontWeight: '800', letterSpacing: 2, color: Colors.primaryDark },
  headerSubtitle: { fontSize: 13, color: Colors.muted, marginTop: 2 },
  link: { color: Colors.water, fontWeight: '600', fontSize: 13 },
  hero: { fontSize: 28, fontWeight: '700', color: Colors.text, lineHeight: 34 },
  body: { fontSize: 16, lineHeight: 24, color: Colors.text },
  caption: { fontSize: 13, lineHeight: 18, color: Colors.muted },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 4 },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 14, color: Colors.muted, flex: 1 },
  rowValue: { fontSize: 14, color: Colors.text, fontWeight: '600', flex: 1, textAlign: 'right' },
  label: { fontSize: 13, color: Colors.muted, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: Colors.text,
  },
  button: { marginTop: 6 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  missing: { fontSize: 12, color: Colors.warning, marginTop: 4 },
  why: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  sequence: { fontSize: 16, fontWeight: '600', color: Colors.primaryDark },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  disclaimer: { fontSize: 11, color: Colors.muted, lineHeight: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginRight: 4 },
  mapBox: { height: 320, borderRadius: 14, overflow: 'hidden', backgroundColor: '#EEECE5' },
  scenarioRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 8, gap: 2 },
  chat: { gap: 8, marginVertical: 6 },
  bubble: { borderRadius: 12, padding: 10, maxWidth: '96%' },
  userBubble: { backgroundColor: '#E8F0E8', alignSelf: 'flex-end' },
  agentBubble: { backgroundColor: '#F2EFE7', alignSelf: 'flex-start' },
  bubbleText: { fontSize: 14, lineHeight: 20, color: Colors.text },
  trace: { fontSize: 11, color: Colors.muted, marginTop: 4 },
  success: { color: Colors.success, fontWeight: '600', marginTop: 6 },
  errorBar: { backgroundColor: '#FDECEA', padding: 8 },
  errorText: { color: Colors.error, fontSize: 13 },
  progressBar: { height: 3, backgroundColor: Colors.warning },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  nav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  navItemActive: { backgroundColor: '#E8F0E8' },
  navText: { fontSize: 13, color: Colors.muted, fontWeight: '600' },
  navTextActive: { color: Colors.primaryDark },
  api: { textAlign: 'center', fontSize: 10, color: Colors.muted, marginTop: 10 },
});
