import { loadAirports } from '@/lib/airports';
import { parseFlightsFile } from '@/lib/flights';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import type { Airport, FlightEntry } from '@/types/types';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { FileJson, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FlightPathNodeData = { flights?: FlightEntry[]; flightsFileName?: string };
type FlightSide = keyof FlightEntry;

const filterAirports = createFilterOptions<Airport>({
  limit: 50,
  stringify: (airport) => `${airport.iata} ${airport.city} ${airport.name} ${airport.country}`,
});

function FlightPathNode({ id, data }: NodeProps<Node<FlightPathNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);
  const flights = data.flights ?? [];
  const completeCount = flights.filter(({ from, to }) => from && to && from.iata !== to.iata).length;

  useEffect(() => {
    let active = true;
    loadAirports()
      .then((list) => {
        if (active) setAirports(list);
      })
      .catch((error: unknown) => console.error(error));
    return () => {
      active = false;
    };
  }, []);

  // A manual edit drops the file name, since the list no longer matches the file.
  const commit = useCallback((next: FlightEntry[], fileName?: string) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, flights: next, flightsFileName: fileName } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  const loadFile = (file: File | undefined) => {
    if (!file) return;

    setLoadIssue(null);

    Promise.all([file.text(), loadAirports()])
      .then(([text, list]) => {
        const { flights: next, unknownCodes } = parseFlightsFile(text, list);

        commit(next, file.name);

        if (unknownCodes.length > 0) {
          setLoadIssue(t('pipelineFlightPathUnknownAirports', { codes: unknownCodes.join(', ') }));
        }
      })
      .catch((error: unknown) => {
        console.warn('Could not load flights file', error);
        setLoadIssue(t('pipelineFlightPathInvalidFile'));
      });
  };

  const changeAirport = (index: number, side: FlightSide, airport: Airport | null) => {
    commit(flights.map((flight, flightIndex) =>
      flightIndex === index ? { ...flight, [side]: airport } : flight
    ));
  };

  const removeFlight = (index: number) => {
    commit(flights.filter((_, flightIndex) => flightIndex !== index));
  };

  return (
    <NodeWrapper type="flight-path">
      <Typography variant="body2" color="text.secondary">
        {t('pipelineFlightPathSummary', { count: completeCount })}
      </Typography>
      {data.flightsFileName && (
        <Typography variant="caption" color="text.secondary" component="div">
          {data.flightsFileName}
        </Typography>
      )}
      {flights.length === 0 && (
        <Typography variant="caption" color="text.secondary" component="div">
          {t('pipelineFlightPathHint')}
        </Typography>
      )}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button
          className="nodrag nopan"
          component="label"
          size="small"
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
