import { createLocalStorageStoreNg } from '@/lib/createLocalStorageStoreNg';
import type { SupportedLanguage } from '@/lib/i18n';

type SettingsStore = {
  onboarding: boolean,
  onboardingStep: number,
  newVersion?: boolean,
  templatesOpen: boolean,
  pipelineSequentialMode: boolean,
  performanceMode: boolean,
  tutorial: boolean,
  themeMode?: 'light' | 'dark',
  themeId: string,
  activeSettingsTab?: string,
  loading: boolean,
  loadingValue: number | null,
  showSettings: boolean,
  showHelp: boolean,
  helpIndependent: boolean,
  locale: SupportedLanguage,
}

const defaults: SettingsStore = {
  onboarding: true,
  onboardingStep: 0,
  newVersion: false,
  helpIndependent: false,
  performanceMode: false,
  templatesOpen: false,
  themeMode: 'light',
  themeId: 'default',
  tutorial: false,
  loading: false,
  loadingValue: null,
  pipelineSequentialMode: false,
  showSettings: false,
  activeSettingsTab: undefined,
  showHelp: false,
  locale: 'en',
} satisfies SettingsStore;

const {
  Provider: SettingsProvider,
  useSetStore,
  useStoreSelector: useSettingsStoreSelector,
  getStore: getSettingsStore,
  setStore: setSettingsStore,
} = createLocalStorageStoreNg<SettingsStore>(defaults, 'settingsStore')

export const useSettings = () => {
  const setSetting = useSetStore()

  return { setSetting }
}

export { getSettingsStore, setSettingsStore, SettingsProvider, useSettingsStoreSelector };
