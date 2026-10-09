import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';
import { Box, Typography } from '@mui/material';
import { Position, type Node, type NodeProps } from '@xyflow/react';
import L from 'leaflet';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

function GpsMapNode({ data }: NodeProps<Node<{ geojson?: GeoJsonFeatureCollectionArray }>>) {
  const { t } = useTranslation();
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const hasCollections = (data.geojson ?? []).length > 0;
  const features = useMemo(
    () => (data.geojson ?? []).flatMap((collection) => collection.features),
    [data.geojson]
  );

  useEffect(() => {
    if (!mapElementRef.current) return;

    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (features.length === 0) {
      map.setView([0, 0], 2);
      return;
    }

    const layer = L.geoJSON(
      { type: 'FeatureCollection', features } as unknown as Parameters<typeof L.geoJSON>[0],
      {
        style: {
          color: '#d32f2f',
          weight: 3,
          fillColor: '#d32f2f',
          fillOpacity: 0.3,
        },
        pointToLayer: (_feature: GeoJsonFeature, latlng: { lat: number; lng: number }) =>
          L.circleMarker(latlng, {
            radius: 7,
            color: '#ffffff',
            weight: 2,
            fillColor: '#d32f2f',
            fillOpacity: 0.9,
          }),
        onEachFeature: (feature: GeoJsonFeature, featureLayer: { bindTooltip: (content: string) => unknown }) => {
          const name = feature.properties?.name;
          if (typeof name === 'string' && name.length > 0) {
            featureLayer.bindTooltip(name);
          }
        },
      }
    ).addTo(map);
    layerRef.current = layer;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
    }
    map.invalidateSize();
  }, [features]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="gps-map">
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {t('pipelineGpsMarkers', { count: features.length })}
        </Typography>
        <Box className="nowheel" sx={{ width: '500px', height: '500px', position: 'relative' }}>
          <Box ref={mapElementRef} sx={{ width: '100%', height: '100%' }} />
          {features.length === 0 && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {hasCollections
                  ? t('pipelineGeoJsonNoFeatures')
                  : t('pipelineGpsMapConnectGeoJson')}
              </Typography>
            </Box>
          )}
        </Box>
      </NodeWrapper>
    </>
  );
}

export default GpsMapNode;
