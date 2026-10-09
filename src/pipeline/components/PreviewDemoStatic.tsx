import { NodePaletteItem, NodeType } from '@/pipeline/NodePalette';
import { PreviewBeforeAfter } from '@/pipeline/components/PreviewBeforeAfter';
import { PreviewDescription } from '@/pipeline/components/PreviewDescription';
import PreviewTitle from '@/pipeline/components/PreviewTitle';
import { Box, useTheme } from '@mui/material';
import { Layers, Map } from 'lucide-react';

type AdjustmentPreviewProps = {
  paletteItem: NodePaletteItem;
  width?: number;
  showText?: boolean;
};

export function PreviewDemoStatic({ paletteItem, width, showText = false }: AdjustmentPreviewProps) {
  const theme = useTheme();

  const sampleImage = <img src="sample.jpg" style={{ width: `${width ?? 90}px`, borderRadius: '8px', border: `1px solid ${theme.palette.divider}` }} />;

  const iconBox = (icon: React.ReactNode) => (
    <Box sx={{ p: 2, py: 1, gap: 2, border: 1, borderColor: theme.palette.divider, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </Box>
  );

  const imagesPairs: Partial<Record<NodeType, { before: React.ReactNode; after: React.ReactNode }>> = {
    [NodeType.GpsMap]: {
      before: sampleImage,
      after: iconBox(<Map color={theme.palette.primary.main} />),
    },
    [NodeType.GeoJsonViewer]: {
      before: sampleImage,
      after: iconBox(<Layers color={theme.palette.primary.main} />),
    },
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 0.5,
      p: 1,
      justifyContent: 'center',
      transition: 'opacity 0.25s ease',
      '&:hover': {
        opacity: 1,
      }
    }}>
      {imagesPairs[paletteItem.type] && <Box sx={{ p: 1 }}>
        <PreviewBeforeAfter
          width={width ?? 90}
          after={imagesPairs[paletteItem.type]!.after}
          before={imagesPairs[paletteItem.type]!.before}
        />
      </Box>}

      {showText && (
        <>
          <PreviewTitle paletteItem={paletteItem} />
          <PreviewDescription paletteItem={paletteItem} />
        </>
      )}
    </Box>
  );
}
