import NewChip from '@/components/NewChip';
import { Box, LinearProgress, Tooltip, Typography } from '@mui/material';
import { Timer } from 'lucide-react';
import { useEffect, useState } from 'react';

type StageTimingDetail = {
  nodeId: string;
  durationMs: number;
  cached?: boolean;
};

type StageProgressDetail = {
  nodeId: string;
  completed: number;
  total: number;
};

type PipelineStageTimingProps = {
  nodeId: string;
  nodeType: string;
  isBusy?: (busy: boolean) => void;
};

export default function PipelineStageTiming({
  nodeId,
  nodeType,
  isBusy,
}: PipelineStageTimingProps) {
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [progress, setProgress] = useState<StageProgressDetail | null>(null);

  useEffect(() => {
    const startedEventName = `${nodeType}:stageStarted`;
    const timingEventName = `${nodeType}:stageTiming`;
    const progressEventName = `${nodeType}:progress`;

    // A newer evaluation supersedes any in-flight run. Its worker messages
    // are dropped, so stop this node's clock here instead of letting it spin.
    const handleEvaluationStarted = () => {
      setIsProcessing(false);
      setStartedAt(null);
      setElapsedMs(0);
      setProgress(null);
      isBusy?.(false);
    };

    const handleStarted = (event: Event) => {
      const { nodeId: startedNodeId } =
      (event as CustomEvent<{ nodeId: string }>).detail;

      if (startedNodeId === nodeId) {
        setIsProcessing(true);
        setIsCached(false);
        setStartedAt(performance.now());
        setElapsedMs(0);
        setProgress(null);
        isBusy?.(true);
      }
    };

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<StageProgressDetail>).detail;

      if (detail.nodeId === nodeId) setProgress(detail);
    };

    const handleTiming = (event: Event) => {
      const { nodeId: timingNodeId, durationMs: nextDurationMs, cached } =
      (event as CustomEvent<StageTimingDetail>).detail;

      if (timingNodeId === nodeId) {
        setIsProcessing(false);
        setStartedAt(null);
        isBusy?.(false);
        setDurationMs(nextDurationMs);
        setIsCached(Boolean(cached));
        setProgress(null);
      }
    };

    window.addEventListener('pipeline:evaluationStarted', handleEvaluationStarted);
    window.addEventListener(startedEventName, handleStarted);
    window.addEventListener(timingEventName, handleTiming);
    window.addEventListener(progressEventName, handleProgress);

    return () => {
      window.removeEventListener('pipeline:evaluationStarted', handleEvaluationStarted);
      window.removeEventListener(startedEventName, handleStarted);
      window.removeEventListener(timingEventName, handleTiming);
      window.removeEventListener(progressEventName, handleProgress);
    };
  }, [nodeId, nodeType, isBusy]);

  useEffect(() => {
    if (!isProcessing || startedAt === null) return;

    const interval = setInterval(() => {
      setElapsedMs(performance.now() - startedAt);
    }, 50);

    return () => clearInterval(interval);
  }, [isProcessing, startedAt]);

  const displayInSeconds = durationMs === null ? '--' : (durationMs / 1000).toFixed(2);
  const timingTooltip = isCached
    ? 'Result reused from cache'
    : `Time taken to process: ${displayInSeconds} s`;
  const progressPercent = progress && progress.total > 0
    ? Math.min(100, Math.max(0, ((Math.min(progress.completed + 1, progress.total)) / progress.total) * 100))
    : 0;
  const currentIndex = progress && progress.total > 0
    ? Math.min(progress.completed + 1, progress.total)
    : 0;

  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    {isProcessing && (
      <Box sx={{ position: 'relative', width: 100, minHeight: 32, display: 'flex', alignItems: 'center' }}>
        {progress && progress.total > 0 ? <Box sx={{ width: '100%' }}>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            aria-label={`${progress.completed} of ${progress.total}`}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            {currentIndex}/{progress.total}
          </Typography>
        </Box> : <>
          <LinearProgress
            variant="indeterminate"
            sx={{
              position: 'absolute',
              inset: 0,
              height: 32,
              borderRadius: 2,
              opacity: 0.2,
            }}
          />

          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {(elapsedMs / 1000).toFixed(2)} s
          </Box>
        </>}
      </Box>
    )}
    {!isProcessing && <Tooltip title={timingTooltip}>
      <span>
        <NewChip
          fontSize={18}
          sx={{ width: '100px'}}
          label={isCached ? '' : 's'}
          count={isCached ? 'cached' : displayInSeconds}
          icon={<Timer size={16} />}
          borderless/>
      </span>
    </Tooltip>}
  </Box>;
}
