import { loadAirports } from '@/lib/airports';
import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import PipelineStageTiming from '@/pipeline/components/PipelineStageTiming';
import type { Airport } from '@/types/types';
import { Stack, TextField, Typography } from '@mui/material';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { useCallback, useEffect, useState, type HTMLAttributes, type Key } from 'react';
import { useTranslation } from 'react-i18next';

type ShortestRouteNodeData = { from?: Airport | null; to?: Airport | null; via?: Airport[] };
type EndpointSide = 'from' | 'to';

const filterAirports = createFilterOptions<Airport>({
  limit: 50,
  stringify: (airport) => `${airport.iata} ${airport.city} ${airport.name} ${airport.country}`,
});

function ShortestRouteNode({ id, data }: NodeProps<Node<ShortestRouteNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loadIssue, setLoadIssue] = useState<string | null>(null);
  const sameEndpoints = data.from && data.to && data.from.iata === data.to.iata;
  const hasStops = (data.via?.length ?? 0) > 0;

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

  const airportOptionLabel = (airport: Airport) => airport.iata;
  const renderAirportOption = ({ key, ...props }: HTMLAttributes<HTMLLIElement> & { key: Key }, airport: Airport) => (
    <li key={key} {...props}>
      {`${airport.iata} · ${airport.city}, ${airport.country}`}
    </li>
  );

  const renderEndpointField = (side: EndpointSide, label: string) => (
    <Autocomplete<Airport>
      className="nodrag nopan"
      size="small"
      options={airports}
      loading={airports.length === 0 && loadIssue === null}
      value={data[side] ?? null}
      onChange={(_event, airport) => commit({ [side]: airport })}
      filterOptions={filterAirports}
      isOptionEqualToValue={(option, value) => option.iata === value.iata}
      getOptionLabel={airportOptionLabel}
      renderOption={renderAirportOption}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="shortest-route" tools={<PipelineStageTiming nodeId={id} nodeType={'shortest-route'} />}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ pb: 1 }}>
          {t('pipelineShortestRouteHint')}
        </Typography>
        <Stack spacing={1} sx={{ minWidth: 220 }}>
          {renderEndpointField('from', t('pipelineShortestRouteFrom'))}
          <Autocomplete<Airport, true>
            className="nodrag nopan"
            multiple
            size="small"
            options={airports}
            loading={airports.length === 0 && loadIssue === null}
            value={data.via ?? []}
            onChange={(_event, stops) => commit({ via: stops })}
            filterOptions={filterAirports}
            filterSelectedOptions
            isOptionEqualToValue={(option, value) => option.iata === value.iata}
            getOptionLabel={airportOptionLabel}
            renderOption={renderAirportOption}
            renderInput={(params) => <TextField {...params} label={t('pipelineShortestRouteVia')} />}
          />
          {renderEndpointField('to', t('pipelineShortestRouteTo'))}
        </Stack>
        {sameEndpoints && !hasStops && (
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
