import NewChip from '@/components/NewChip';
import { usePipelineStoreSelector } from '@/context/pipelineStore';
import { loadAirports } from '@/lib/airports';
import { parseFlightsFile } from '@/lib/flights';
import { createFlightsKey, deleteFlights, saveFlights } from '@/lib/flightsFileStore';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { FlightEntry } from '@/types/types';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { ChevronsRight, File, FileJson } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FlightPathNodeData = {
  // The flight list itself lives in IndexedDB under flightsKey (see flightsFileStore).
  flightsKey?: string;
  flightsFileName?: string;
  completeCount?: number;
  // Legacy: lists saved before they moved to IndexedDB. Moved out on mount.
  flights?: FlightEntry[];
};

type FlightListRef = Pick<FlightPathNodeData, 'flightsKey' | 'flightsFileName' | 'completeCount'>;
type FlightSide = 'from' | 'to';

const countCompleteFlights = (flights: FlightEntry[]) =>
  flights.filter(({ from, to }) => from && to && from.iata !== to.iata).length;

function FlightPathNode({ id, data }: NodeProps<Node<FlightPathNodeData>>) {
  const { t } = useTranslation();
  const { setNodes, getNodes } = useReactFlow();
  const savedPipelines = usePipelineStoreSelector((state) => state.pipelines);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);
  const completeCount = data.completeCount ?? countCompleteFlights(data.flights ?? []);

  useEffect(() => {
    let active = true;
    loadAirports()
      .then((list) => {
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      active = false;
    };
  }, []);

  // Replaces the list reference and drops any legacy inline list.
  const commit = useCallback((ref: FlightListRef) => {
    setNodes((current) => current.map((node) => {
      if (node.id !== id) return node;

      const { flights: _legacyFlights, ...rest } = node.data;

      return { ...node, data: { ...rest, ...ref } };
    }));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  // A stored list may still back a saved pipeline or a cloned node on the
  // canvas, so it is only removed when nothing else references it.
  const isFlightsKeyReferenced = (key: string) =>
    savedPipelines.some((pipeline) => pipeline.nodes.some((node) => node.data.flightsKey === key)) ||
    getNodes().some((node) => node.id !== id && node.data.flightsKey === key);

  // Moves a legacy inline list into IndexedDB. Skipped if the list was replaced meanwhile.
  useEffect(() => {
    const legacy = data.flights;
    if (!legacy) return;

    const flightsKey = createFlightsKey();

    saveFlights(flightsKey, legacy)
      .then(() => {
        const current = getNodes().find((node) => node.id === id);

        if (current?.data.flights !== legacy) {
          return deleteFlights(flightsKey);
        }

        commit({
          flightsKey,
          completeCount: countCompleteFlights(legacy),
          flightsFileName: data.flightsFileName,
        });
      })
      .catch((reason: unknown) => {
        console.warn('Could not move flights out of node data', reason);
      });
  }, [commit, data.flights, data.flightsFileName, getNodes, id]);

  const loadFile = (file: File | undefined) => {
    if (!file) return;

    setLoadIssue(null);

    Promise.all([file.text(), loadAirports()])
      .then(async ([text, list]) => {
        const { flights: next, unknownCodes } = parseFlightsFile(text, list);
        const flightsKey = createFlightsKey();

        await saveFlights(flightsKey, next);

        const previousKey = getNodes().find((node) => node.id === id)?.data.flightsKey as string | undefined;

        commit({
          flightsKey,
          completeCount: countCompleteFlights(next),
          flightsFileName: file.name,
        });

        if (previousKey && !isFlightsKeyReferenced(previousKey)) {
          deleteFlights(previousKey).catch((reason: unknown) => {
            console.warn('Could not remove previous flights', reason);
          });
        }

        if (unknownCodes.length > 0) {
          setLoadIssue(t('pipelineFlightPathUnknownAirports', { codes: unknownCodes.join(', ') }));
        }
      })
      .catch((error: unknown) => {
        console.warn('Could not load flights file', error);
        setLoadIssue(t('pipelineFlightPathInvalidFile'));
      });
  };

  return (
    <NodeWrapper type="flight-path" tools={<PipelineStageTiming nodeId={id} nodeType={'flight-path'} />}>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {data.flightsFileName && (
          <NewChip count={''} label={data.flightsFileName} fontSize={16} icon={<File size={16} />} sx={{ height: 38 }} />
        )}
        <NewChip count={completeCount ?? 0} label={"Flights"} fontSize={16} icon={<ChevronsRight size={16} />} sx={{ height: 38 }} />
      </Box>
      {!data.flightsKey && (data.flights?.length ?? 0) === 0 && (
        <Typography variant="caption" color="text.secondary" component="div">
          {t('pipelineFlightPathHint')}
        </Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          className="nodrag nopan"
          component="label"
          startIcon={<FileJson size={16} />}
        >
          {t('pipelineFlightPathLoadFile')}
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              loadFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </Button>
      </Stack>
      {loadIssue && (
        <Typography variant="caption" color="error" component="div">
          {loadIssue}
        </Typography>
      )}
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default FlightPathNode;
