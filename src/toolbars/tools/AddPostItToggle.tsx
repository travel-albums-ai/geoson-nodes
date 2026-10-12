import { GenericToggleButtonProps } from '@/components/generics/GenericToggleButton';
import GenericToggleButtonGroup from '@/components/generics/GenericToggleButtonGroup';
import { usePipelineCanvas } from '@/hooks/usePipelineCanvas';
import { StickyNote } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function AddPostItToggle() {
  const { actionsRef } = usePipelineCanvas();
  const { t } = useTranslation();

  return <>
    <GenericToggleButtonGroup variant="standard" id="add-post-it-toggle" items={[
      {
        tooltip: t('toolboxAddPostIt'),
        tooltipPlacement: 'right',
        icon: <StickyNote size={16} />,
        onClick: () => actionsRef.current.addPostIt(),
        selected: false,
      }
    ] satisfies GenericToggleButtonProps[]} />
  </>
}
