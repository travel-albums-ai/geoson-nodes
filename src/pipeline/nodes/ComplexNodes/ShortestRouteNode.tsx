import NewChip from '@/components/NewChip';
import { loadAirports } from '@/lib/airports';
import { toAirportList } from '@/lib/flightRoutes';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import { SHORTEST_ROUTE_COUNTS_EVENT, type Airport } from '@/types/types';
import { Stack, TextField, Typography } from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { LogIn, LogOut } from 'lucide-react';
import { useCallback, useEffect, useState, type HTMLAttributes, type Key } from 'react';
import { useTranslation } from 'react-i18next';

// "from" and "to" are lists of airports. A single airport from before they were lists is still accepted.
type ShortestRouteNodeData = { from?: Airport | Airport[] | null; to?: Airport | Airport[] | null; via?: Airport[] };

type ShortestRouteCountsEventDetail = {
  nodeId: string;
  inputCount: number;
  outputCount: number;
};

const filterAirports = createFilterOptions<Airport>({
  limit: 50,
  stringify: (airport) => `${airport.iata} ${airport.city} ${airport.name} ${airport.country}`,
});

function ShortestRouteNode({ id, data }: NodeProps<Node<ShortestRouteNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);
  const [counts, setCounts] = useState<ShortestRouteCountsEventDetail | null>(null);
  const fromAirports = toAirportList(data.from);
  const toAirports = toAirportList(data.to);
  const hasStops = (data.via?.length ?? 0) > 0;
  const returnsToStart = fromAirports.some((from) => toAirports.some((to) => to.iata === from.iata));
  const roundTripNeedsStop = returnsToStart && !hasStops;

  useEffect(() => {
    const handleCounts = (event: Event) => {
      const detail = (event as CustomEvent<ShortestRouteCountsEventDetail>).detail;

      if (detail.nodeId === id) {
        setCounts(detail);
      }
    };

    window.addEventListener(SHORTEST_ROUTE_COUNTS_EVENT, handleCounts);
    return () => window.removeEventListener(SHORTEST_ROUTE_COUNTS_EVENT, handleCounts);
  }, [id]);

  useEffect(() => {
    let active = true;
    loadAirports()
      .then((list) => {
        if (active) setAirports(list);
      })
      .catch((error: unknown) => {
        console.error(error);
        if (active) setLoadIssue(t('pipelineFlightPathLoading'));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const commit = useCallback((patch: Partial<ShortestRouteNodeData>) => {
    setNodes((current) => current.map((node) =>
      node.id === id
        ? { ...node, data: { ...node.data, ...patch } }
        : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, setNodes]);

  const airportOptionLabel = (airport: Airport) => `${airport.name} (${airport.iata})`;
  const renderAirportOption = ({ key, ...props }: HTMLAttributes<HTMLLIElement> & { key: Key }, airport: Airport) => (
    <li key={key} {...props}>
      {`${airport.iata} · ${airport.city}, ${airport.country}`}
    </li>
  );

  const renderAirportListField = (field: 'from' | 'via' | 'to', label: string) => (
    <Autocomplete<Airport, true>
      className="nodrag nopan"
      multiple
      size="small"
      options={airports}
      loading={airports.length === 0 && loadIssue === null}
      value={field === 'from' ? fromAirports : field === 'to' ? toAirports : data.via ?? []}
      onChange={(_event, list) => commit({ [field]: list })}
      filterOptions={filterAirports}
      filterSelectedOptions
      isOptionEqualToValue={(option, value) => option.iata === value.iata}
      getOptionLabel={airportOptionLabel}
      renderOption={renderAirportOption}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper
        type="shortest-route"
        inputCounts={
          <NewChip
            count={counts?.inputCount ?? 0}
            label={''}
            icon={<LogIn size={16} />}
            tooltip={t('pipelineShortestRouteEntering')}
            fontSize={12}
          />
        }
        outputCounts={
          <NewChip
            variant="important"
            count={counts?.outputCount ?? 0}
            label={''}
            icon={<LogOut size={16} />}
            tooltip={t('pipelineShortestRouteLeaving')}
            fontSize={12}
          />
        }
        tools={<PipelineStageTiming nodeId={id} nodeType={'shortest-route'} />}
      >
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineShortestRouteHint')}
        </Typography>
        <Stack spacing={1} sx={{ minWidth: 220 }}>
          {renderAirportListField('from', t('pipelineShortestRouteFrom'))}
          {renderAirportListField('via', t('pipelineShortestRouteVia'))}
          {renderAirportListField('to', t('pipelineShortestRouteTo'))}
        </Stack>
        {roundTripNeedsStop && (
          <Typography variant="caption" color="error" component="div" sx={{ pt: 1 }}>
            {t('pipelineShortestRouteRoundTripHint')}
          </Typography>
        )}
        {loadIssue && (
          <Typography variant="caption" color="error" component="div" sx={{ pt: 1 }}>
            {loadIssue}
          </Typography>
        )}
        <OutputHandle id="geojson" position={Position.Bottom} />
      </NodeWrapper>
    </>
  );
}

export default ShortestRouteNode;
