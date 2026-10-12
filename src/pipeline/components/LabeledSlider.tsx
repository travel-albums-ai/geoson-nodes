import NewChip from '@/components/NewChip';
import { Box, Slider, Typography } from '@mui/material';

type LabeledSliderProps = {
  label: string;
  value: number;
  valueText: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

function LabeledSlider({ label, value, valueText, min, max, step, onChange }: LabeledSliderProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'row', gap: 2, alignItems: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ width: 150 }}>{label}</Typography>
      <Slider
        size="small"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(_, next) => onChange(next as number)}
      />
      <Box sx={{ flex: '0 0 60px'}}>
        <NewChip label={valueText} />
      </Box>
    </Box>
  );
}

export default LabeledSlider;
