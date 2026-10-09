import { loadAirports } from '@/lib/airports';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import type { Airport, FlightEntry } from '@/types/types';
import { Box, Button, IconButton, Stack, TextField, Typography } from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FlightPathNodeData = { flights?: FlightEntry[] };
type FlightSide = keyof FlightEntry;

const filterAirports = createFilterOptions<Airport>({
  limit: 50,
  stringify: (airport) => `${airport.iata} ${airport.city} ${airport.name} ${airport.country}`,
});

function AirportField({ label, value, options, loading, className, onChange }: {
  label: string;
  value: Airport | null;
  options: Airport[];
  loading: boolean;
  className: string;
  onChange: (airport: Airport | null) => void;
}) {
  const { t } = useTranslation();

  return (
    <Autocomplete
      className={className}
      size="small"
      fullWidth
      options={options}
      value={value}
      loading={loading}
      filterOptions={filterAirports}
      getOptionLabel={(airport) => airport.iata}
      isOptionEqualToValue={(option, selected) => option.iata === selected.iata}
      renderOption={(props, airport) => (
        <li {...props} key={airport.iata}>
          <Box>
            <Typography variant="body2">{airport.iata} · {airport.city}</Typography>
            <Typography variant="caption" color="text.secondary">{airport.name}, {airport.country}</Typography>
          </Box>
        </li>
      )}
      noOptionsText={t('pipelineFlightPathNoAirport')}
      loadingText={t('pipelineFlightPathLoading')}
      renderInput={(params) => <TextField {...params} label={label} />}
      onChange={(_, airport) => onChange(airport)}
    />
  );
}

function FlightPathNode({ id, data }: NodeProps<Node<FlightPathNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [airports, setAirports] = useState<Airport[]>([]);
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

  const commit = useCallback((next: FlightEntry[]) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, flights: next } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

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
      <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
        {t('pipelineFlightPathSummary', { count: completeCount })}
      </Typography>
      {flights.length === 0 && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineFlightPathHint')}
        </Typography>
      )}
      <Stack spacing={1.5}>
        {flights.map((flight, index) => (
          <Stack key={index} direction="row" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
            <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
              <AirportField
                className="nodrag nopan"
                label={t('pipelineFlightPathFrom')}
                value={flight.from}
                options={airports}
                loading={airports.length === 0}
                onChange={(airport) => changeAirport(index, 'from', airport)}
              />
              <AirportField
                className="nodrag nopan"
                label={t('pipelineFlightPathTo')}
                value={flight.to}
                options={airports}
                loading={airports.length === 0}
                onChange={(airport) => changeAirport(index, 'to', airport)}
              />
              {flight.from && flight.to && flight.from.iata === flight.to.iata && (
                <Typography variant="caption" color="error" component="div">
                  {t('pipelineFlightPathSameAirport')}
                </Typography>
              )}
            </Stack>
            <IconButton
              className="nodrag nopan"
              size="small"
              aria-label={t('pipelineFlightPathRemove')}
              onClick={() => removeFlight(index)}
            >
              <X size={16} />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Button
        className="nodrag nopan"
        size="small"
        sx={{ mt: 1 }}
        onClick={() => commit([...flights, { from: null, to: null }])}
      >
        {t('pipelineFlightPathAddFlight')}
      </Button>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </NodeWrapper>
  );
}

export default FlightPathNode;
