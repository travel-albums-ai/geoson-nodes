import SettingsSection from '@/components/SettingsSection';
import { useSettings, useSettingsStoreSelector } from '@/context/settingsStore';
import SettingToggleRow from '@/windows/settings/components/SettingToggleRow';
import { Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PerformanceSettings() {
  const { t } = useTranslation()
  const { setSetting } = useSettings()
  const pipelineSequentialMode = useSettingsStoreSelector((state) => state.pipelineSequentialMode)

  return <SettingsSection title={t('pipelineSettingsSection')} icon={<Cpu />}>
    <SettingToggleRow
      label={t('pipelineSequentialMode')}
      selected={pipelineSequentialMode}
      onChange={() => setSetting((prev) => ({
        ...prev,
        pipelineSequentialMode: !prev.pipelineSequentialMode,
      }))}
    />
  </SettingsSection>
}
