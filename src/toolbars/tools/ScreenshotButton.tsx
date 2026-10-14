import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { GenericToggleButtonProps } from '@/components/generics/GenericToggleButton';
import GenericToggleButtonGroup from '@/components/generics/GenericToggleButtonGroup';
import { usePipelineCanvas } from '@/hooks/usePipelineCanvas';

export default function ScreenshotButton() {
  const { actionsRef } = usePipelineCanvas();
  const { t } = useTranslation();

  return (
    <GenericToggleButtonGroup variant="standard" id="screenshot-toggle" items={[
      {
        tooltip: t('screenshotToggleTooltip'),
        icon: <Camera size={16} />,
        onClick: () => actionsRef.current.downloadScreenshot(),
        selected: false,
      },
    ] satisfies GenericToggleButtonProps[]} />
  );
}
