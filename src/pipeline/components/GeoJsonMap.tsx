import type { GeoJsonFeature } from '@/types/types';
import { readFeatureStyle } from '@/lib/geojsonStyle';
import { Box, Typography } from '@mui/material';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

const DEFAULT_COLOR = '#d32f2f';

type GeoJsonMapProps = {
  features: GeoJsonFeature[];
  emptyMessage: string;
};

export default function GeoJsonMap({ features, emptyMessage }: GeoJsonMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!mapElementRef.current) return;

    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      zoomControl: true,
      scrollWheelZoom: false,
      preferCanvas: true,
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
        style: (feature?: GeoJsonFeature) => {
          const style = readFeatureStyle(feature?.properties);
          return {
            color: style.stroke ?? DEFAULT_COLOR,
            opacity: style.strokeOpacity ?? 1,
            weight: 3,
            fillColor: style.fill ?? DEFAULT_COLOR,
            fillOpacity: style.fillOpacity ?? 0.3,
          };
        },
        pointToLayer: (feature: GeoJsonFeature, latlng: { lat: number; lng: number }) => {
          const style = readFeatureStyle(feature.properties);
          return L.circleMarker(latlng, {
            radius: 7,
            color: style.stroke ?? '#ffffff',
            opacity: style.strokeOpacity ?? 1,
            weight: 2,
            fillColor: style.fill ?? DEFAULT_COLOR,
            fillOpacity: style.fillOpacity ?? 0.9,
          });
        },
        onEachFeature: (feature: GeoJsonFeature, featureLayer: { bindTooltip: (content: string) => unknown }) => {
          // Flight routes carry a tooltip with their price, date and extra text.
          const tooltip = feature.properties?.tooltip;
          const label = typeof tooltip === 'string' && tooltip.length > 0
            ? tooltip
            : feature.properties?.name || feature.properties?.name_en;
          if (typeof label === 'string' && label.length > 0) {
            featureLayer.bindTooltip(label);
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
            {emptyMessage}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
