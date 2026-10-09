import { Box, LinearProgress, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

type StageTimingDetail = {
  nodeId: string;
  durationMs: number;
};

type PipelineStageTimingProps = {
  nodeId: string;
  nodeType: string;
  isBusy?: (busy: boolean) => void;
};

export default function PipelineStageProgress({
  nodeId,
  nodeType,
  isBusy,
}: PipelineStageTimingProps) {
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startedEventName = `${nodeType}:stageStarted`;
    const timingEventName = `${nodeType}:stageTiming`;
    const evaluationStartedEventName = 'pipeline:evaluationStarted';
    const handleEvaluationStarted = () => {
      setIsProcessing(false);
      setIsComplete(false);
      isBusy?.(false);
    };
    const handleStarted = (event: Event) => {
      const { nodeId: startedNodeId } =
        (event as CustomEvent<{ nodeId: string }>).detail;

      if (startedNodeId === nodeId) {
        setIsProcessing(true);
        setIsComplete(false);
        isBusy?.(true);
      }
    };
    const handleTiming = (event: Event) => {
      const { nodeId: timingNodeId, durationMs: nextDurationMs } =
        (event as CustomEvent<StageTimingDetail>).detail;

      if (timingNodeId === nodeId) {
        setIsProcessing(false);
        isBusy?.(false);
        setDurationMs(nextDurationMs);
        setIsComplete(true);
      }
    };

    window.addEventListener(startedEventName, handleStarted);
    window.addEventListener(timingEventName, handleTiming);
    window.addEventListener(evaluationStartedEventName, handleEvaluationStarted);
    return () => {
      window.removeEventListener(startedEventName, handleStarted);
      window.removeEventListener(timingEventName, handleTiming);
      window.removeEventListener(evaluationStartedEventName, handleEvaluationStarted);
    };
  }, [nodeId, nodeType]);

  const displayDuration = durationMs === null ? '--' : (durationMs / 1000).toFixed(2);

  return <Box sx={{ flex: 1 }}>
    <Tooltip title={isProcessing ? nodeType + ' - Processing...' : `${nodeType} - Last duration: ${displayDuration} s`} arrow placement="top">
      <LinearProgress
        variant="determinate"
        value={isComplete ? 100 : 0}
        sx={{
          height: 6,
          opacity: 0.8,
        }}
      />
    </Tooltip>
  </Box>;
}
