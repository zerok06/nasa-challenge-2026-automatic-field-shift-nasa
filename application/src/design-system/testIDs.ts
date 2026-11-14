/**
 * Stable testID contract shared by the app and Maestro.
 * Keep these values identical when refactoring screens.
 */
export const testIDs = {
  onboardingDemo: 'onboarding.demo',
  onboardingName: 'onboarding.name',
  onboardingArea: 'onboarding.area',
  onboardingCreate: 'onboarding.create',
  onboardingNext: 'onboarding.next',
  onboardingConsent: 'onboarding.consent',

  dashboardSources: 'dashboard.sources',
  dashboardCompare: 'dashboard.compare',
  dashboardMap: 'dashboard.map',
  dashboardAgent: 'dashboard.agent',

  mapLayerImerg: 'map.layer.imerg',
  mapLayerNdvi: 'map.layer.ndvi',
  mapNdviDateA: 'map.ndvi.dateA',
  mapNdviDateB: 'map.ndvi.dateB',
  mapNdviDates: 'map.ndvi.dates',
  mapLegend: 'map.legend',
  mapWebview: 'map.webview',
  mapFallback: 'map.fallback',

  comparisonCreate: 'comparison.create',
  comparisonSimulate: 'comparison.simulate',
  comparisonPlan: (index: number) => `comparison.plan.${index}`,

  scenarioWaterPreset20: 'scenario.water.preset20',
  scenarioPricePreset15: 'scenario.price.preset15',
  scenarioReset: 'scenario.reset',
  scenarioResult: 'scenario.result',

  agentInput: 'agent.input',
  agentSend: 'agent.send',
  agentSave: 'agent.save',

  navHome: 'nav.home',
  navMap: 'nav.map',
  navRotations: 'nav.rotations',
  navAgent: 'nav.agent',
} as const;

export type TestIDKey = keyof typeof testIDs;
