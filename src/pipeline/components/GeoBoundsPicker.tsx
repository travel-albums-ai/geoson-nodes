import type { GeoBounds } from '@/types/types';
import { Box } from '@mui/material';
import L from 'leaflet';
import { useCallback, useEffect, useRef } from 'react';

// Web Mercator limit; the map cannot show latitudes beyond this.
const MAX_MAP_LATITUDE = 85.0511;
const LINE_COLOR = '#1976d2';

type Edge = keyof GeoBounds;

const EDGES: Edge[] = ['west', 'east', 'south', 'north'];

type PickerLayers = {
  rectangle: L.Rectangle;
  lines: Record<Edge, L.Polyline>;
  grips: Record<Edge, L.Marker>;
};

type GeoBoundsPickerProps = {
  bounds: GeoBounds;
  onCommit: (bounds: GeoBounds) => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// West and east are longitudes (vertical lines); south and north are latitudes (horizontal lines).
const isLongitudeEdge = (edge: Edge) => edge === 'west' || edge === 'east';

// Lines cannot cross, so each edge is limited by its opposite edge.
const clampEdge = (bounds: GeoBounds, edge: Edge, value: number): number => {
  switch (edge) {
    case 'west': return clamp(value, -180, bounds.east);
    case 'east': return clamp(value, bounds.west, 180);
    case 'south': return clamp(value, -MAX_MAP_LATITUDE, bounds.north);
    case 'north': return clamp(value, bounds.south, MAX_MAP_LATITUDE);
  }
};

const gripLatLng = (bounds: GeoBounds, edge: Edge): L.LatLngExpression => {
  if (isLongitudeEdge(edge)) {
    return [(bounds.south + bounds.north) / 2, bounds[edge]];
  }
  return [clamp(bounds[edge], -MAX_MAP_LATITUDE, MAX_MAP_LATITUDE), (bounds.west + bounds.east) / 2];
};

const lineLatLngs = (bounds: GeoBounds, edge: Edge): L.LatLngExpression[] => {
  if (isLongitudeEdge(edge)) {
    return [[-MAX_MAP_LATITUDE, bounds[edge]], [MAX_MAP_LATITUDE, bounds[edge]]];
  }
  const latitude = clamp(bounds[edge], -MAX_MAP_LATITUDE, MAX_MAP_LATITUDE);
  return [[latitude, -180], [latitude, 180]];
};

const gripIcon = (edge: Edge) => {
  const common = `width:100%;height:100%;background:${LINE_COLOR};border:2px solid #fff;border-radius:4px;box-shadow:0 1px 3px rgba(0,0,0,.4)`;

  return isLongitudeEdge(edge)
    ? L.divIcon({
      className: 'geo-bounds-grip',
      html: `<div style="${common};cursor:ew-resize"></div>`,
      iconSize: [10, 24],
      iconAnchor: [5, 12],
    })
    : L.divIcon({
      className: 'geo-bounds-grip',
      html: `<div style="${common};cursor:ns-resize"></div>`,
      iconSize: [24, 10],
      iconAnchor: [12, 5],
    });
};

export default function GeoBoundsPicker({ bounds, onCommit }: GeoBoundsPickerProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<PickerLayers | null>(null);
  const draftRef = useRef<GeoBounds>(bounds);
  const committedRef = useRef<GeoBounds>(bounds);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const render = useCallback((current: GeoBounds) => {
    const layers = layersRef.current;
    if (!layers) return;

    layers.rectangle.setBounds([
      [clamp(current.south, -MAX_MAP_LATITUDE, MAX_MAP_LATITUDE), current.west],
      [clamp(current.north, -MAX_MAP_LATITUDE, MAX_MAP_LATITUDE), current.east],
    ]);

    EDGES.forEach((edge) => {
      layers.lines[edge].setLatLngs(lineLatLngs(current, edge));
      layers.grips[edge].setLatLng(gripLatLng(current, edge));
    });
  }, []);

  useEffect(() => {
    if (!mapElementRef.current) return;

    const map = L.map(mapElementRef.current, {
      attributionControl: true,
      zoomControl: true,
      scrollWheelZoom: false,
      minZoom: 1,
    });
    map.setView([15, 0], 1);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const rectangle = L.rectangle([[0, 0], [0, 0]], {
      color: LINE_COLOR,
      weight: 0,
      fillColor: LINE_COLOR,
      fillOpacity: 0.15,
      interactive: false,
    }).addTo(map);

    const lines = {} as Record<Edge, L.Polyline>;
    const grips = {} as Record<Edge, L.Marker>;

    EDGES.forEach((edge) => {
      lines[edge] = L.polyline([], { color: LINE_COLOR, weight: 2, interactive: false }).addTo(map);

      const grip = L.marker([0, 0], { icon: gripIcon(edge), draggable: true, keyboard: false }).addTo(map);

      grip.on('drag', () => {
        const pointer = grip.getLatLng();
        const current = draftRef.current;
        const value = isLongitudeEdge(edge) ? pointer.lng : pointer.lat;
        const next = { ...current, [edge]: clampEdge(current, edge, value) };
        draftRef.current = next;
        render(next);
      });

      grip.on('dragend', () => {
        const next = draftRef.current;
        const previous = committedRef.current;
        const changed = EDGES.some((key) => next[key] !== previous[key]);
        if (changed) {
          committedRef.current = next;
          onCommitRef.current(next);
        }
      });

      grips[edge] = grip;
    });

    layersRef.current = { rectangle, lines, grips };

    return () => {
      layersRef.current = null;
      map.remove();
    };
  }, [render]);

  useEffect(() => {
    draftRef.current = bounds;
    committedRef.current = bounds;
    render(bounds);
  }, [bounds, render]);

  return (
    <Box className="nowheel" sx={{ width: '420px', height: '320px', position: 'relative' }}>
      <Box ref={mapElementRef} sx={{ width: '100%', height: '100%' }} />
    </Box>
  );
}
