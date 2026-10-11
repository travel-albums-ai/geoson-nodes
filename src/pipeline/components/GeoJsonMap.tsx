import { readFeatureStyle } from '@/lib/geojsonStyle';
import type { GeoJsonFeature } from '@/types/types';
import { Box, Typography } from '@mui/material';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

const DEFAULT_COLOR = '#d32f2f';
const NO_MARKER_KEYS: string[] = [];

type GeoJsonMapProps = {
  features: GeoJsonFeature[];
  emptyMessage: string;
  // Called after the features are drawn and the map has no tiles left to load.
  onLoaded?: () => void;
  // Property keys whose values make up the tooltip of point markers.
  markerKeys?: string[];
};

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function formatValue(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function bindFeatureTooltip(featureLayer: L.Layer, feature: GeoJsonFeature | undefined, markerKeys: string[]) {
  featureLayer.unbindTooltip();
  if (!feature) return;

  if (markerKeys.length > 0 && feature.geometry?.type === 'Point') {
    const label = markerKeys
      .filter((key) => !isEmptyValue(feature.properties?.[key]))
      .map((key) => `${key}: ${formatValue(feature.properties?.[key])}`)
      .join(', ');
    if (label.length > 0) featureLayer.bindTooltip(escapeHtml(label));
    return;
  }

  // Flight routes carry a tooltip with their price, date and extra text.
  const tooltip = feature.properties?.tooltip;
  const label = typeof tooltip === 'string' && tooltip.length > 0
    ? tooltip
    : feature.properties?.name || feature.properties?.name_en || feature.properties?.title;
  if (typeof label === 'string' && label.length > 0) {
    featureLayer.bindTooltip(label);
  }
}

export default function GeoJsonMap({ features, emptyMessage, onLoaded, markerKeys = NO_MARKER_KEYS }: GeoJsonMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const onLoadedRef = useRef(onLoaded);
  const markerKeysRef = useRef(markerKeys);

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    markerKeysRef.current = markerKeys;
    layerRef.current?.eachLayer((featureLayer: L.Layer) => {
      bindFeatureTooltip(featureLayer, (featureLayer as L.Layer & { feature?: GeoJsonFeature }).feature, markerKeys);
    });
  }, [markerKeys]);

  useEffect(() => {
    if (!mapElementRef.current) return;

    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      zoomControl: true,
      scrollWheelZoom: false,
      preferCanvas: true,
    });
    mapRef.current = map;

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Leaflet caches its container size, so it must be told when the node is resized.
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapElementRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const tileLayer = tileLayerRef.current;
    if (!map || !tileLayer) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const handleTilesLoaded = () => {
      tileLayer.off('load', handleTilesLoaded);
      onLoadedRef.current?.();
    };

    // Leaflet only fires 'load' when a tile finishes, so when the view needs no new tiles we report right away.
    const handleViewSettled = () => {
      map.off('moveend', handleViewSettled);

      if (tileLayer.isLoading()) {
        tileLayer.on('load', handleTilesLoaded);
      } else {
        onLoadedRef.current?.();
      }
    };

    map.invalidateSize();
    map.on('moveend', handleViewSettled);

    if (features.length === 0) {
      map.setView([0, 0], 2);
    } else {
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
          onEachFeature: (feature: GeoJsonFeature, featureLayer: L.Layer) => {
            bindFeatureTooltip(featureLayer, feature, markerKeysRef.current);
          },
        }
      ).addTo(map);
      layerRef.current = layer;

      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      } else {
        handleViewSettled();
      }
    }

    return () => {
      map.off('moveend', handleViewSettled);
      tileLayer.off('load', handleTilesLoaded);
    };
  }, [features]);

  return (
    <Box className="nowheel" sx={{ position: 'relative', width: '100%', flex: '1 1 500px', minWidth: 0, minHeight: 0 }}>
      <Box ref={mapElementRef} sx={{ position: 'absolute', inset: 0 }} />
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
