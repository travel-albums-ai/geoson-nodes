import { DEFAULT_GEOJSON_STYLE, GEOJSON_STROKE_WIDTH, listFeaturePropertyKeys, readGeoJsonStyleSettings, type GeoJsonColorSource, type GeoJsonStyleSettings } from '@/lib/geojsonStyle';
import { InputHandle } from '@/pipeline/components/InputHandle';
import LabeledSlider from '@/pipeline/components/LabeledSlider';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, MenuItem, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type ColorChoice = {
  source: GeoJsonColorSource;
  color: string;
  key: string;
  base: string;
};

type ColorFieldProps = {
  label: string;
  value: ColorChoice;
  propertyKeys: string[];
  onChange: (next: ColorChoice) => void;
};

// A palette color or a color generated from a property. The property options come from the input features.
function ColorField({ label, value, propertyKeys, onChange }: ColorFieldProps) {
  const { t } = useTranslation();
  const keyOptions = value.key !== '' && !propertyKeys.includes(value.key)
    ? [value.key, ...propertyKeys]
    : propertyKeys;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={value.source}
          onChange={(_, source: GeoJsonColorSource | null) => {
            if (source !== null) onChange({ ...value, source });
          }}
        >
          <ToggleButton value="palette">{t('pipelineGeoJsonStyleFromPalette')}</ToggleButton>
          <ToggleButton value="generated">{t('pipelineGeoJsonStyleGenerated')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {value.source === 'palette' ? (
        <TextField
          size="small"
          type="color"
          label={label}
          value={value.color}
          onChange={(event) => onChange({ ...value, color: event.target.value })}
          fullWidth
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1 }}>
          <TextField
            sx={{ flex: '0 0 100px'}}
            size="small"
            type="color"
            label={t('pipelineGeoJsonStyleBaseColor')}
            value={value.base}
            onChange={(event) => onChange({ ...value, base: event.target.value })}
            fullWidth
          />
          <TextField
            sx={{ flex: '0 1 300px'}}
            size="small"
            select
            label={t('pipelineGeoJsonStyleKey')}
            value={value.key}
            onChange={(event) => onChange({ ...value, key: event.target.value })}
            helperText={keyOptions.length === 0 ? t('pipelineGeoJsonStyleNoKeys') : t('pipelineGeoJsonStyleKeyHint')}
            fullWidth
          >
            {keyOptions.map((key) => (
              <MenuItem key={key} value={key}>{key}</MenuItem>
            ))}
          </TextField>
        </Box>
      )}
    </Box>
  );
}

function GeoJsonStyleNode({ id, data }: NodeProps<Node<{ style?: Partial<GeoJsonStyleSettings>; geojson?: GeoJsonFeatureCollectionArray }>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const style = readGeoJsonStyleSettings({ ...DEFAULT_GEOJSON_STYLE, ...data.style });
  const propertyKeys = useMemo(() => listFeaturePropertyKeys(data.geojson ?? []), [data.geojson]);

  const updateStyle = useCallback((patch: Partial<GeoJsonStyleSettings>) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, style: { ...readGeoJsonStyleSettings(node.data.style), ...patch } } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper
        type="geojson-style"
        hint={<>{t('pipelineGeoJsonStyleHint')}</>}
        tools={<PipelineStageTiming nodeId={id} nodeType={'geojson-style'} />}
      >
        <Box className="nodrag nopan" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ColorField
            label={t('pipelineGeoJsonStyleFill')}
            value={{ source: style.fillSource, color: style.fill, key: style.fillKey, base: style.fillBase }}
            propertyKeys={propertyKeys}
            onChange={(next) => updateStyle({ fillSource: next.source, fill: next.color, fillKey: next.key, fillBase: next.base })}
          />
          <ColorField
            label={t('pipelineGeoJsonStyleStroke')}
            value={{ source: style.strokeSource, color: style.stroke, key: style.strokeKey, base: style.strokeBase }}
            propertyKeys={propertyKeys}
            onChange={(next) => updateStyle({ strokeSource: next.source, stroke: next.color, strokeKey: next.key, strokeBase: next.base })}
          />
          <LabeledSlider
            label={t('pipelineGeoJsonStyleStrokeWidth')}
            value={style.strokeWidth}
            valueText={`${style.strokeWidth} px`}
            min={GEOJSON_STROKE_WIDTH.min}
            max={GEOJSON_STROKE_WIDTH.max}
            step={GEOJSON_STROKE_WIDTH.step}
            onChange={(strokeWidth) => updateStyle({ strokeWidth })}
          />
          <LabeledSlider
            label={t('pipelineGeoJsonStyleOpacity')}
            value={Math.round(style.opacity * 100)}
            valueText={`${Math.round(style.opacity * 100)}%`}
            min={0}
            max={100}
            onChange={(opacity) => updateStyle({ opacity: opacity / 100 })}
          />
        </Box>
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default GeoJsonStyleNode;
