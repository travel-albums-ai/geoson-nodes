import { readFeatureStyle } from '@/lib/geojsonStyle';
import type { GeoJsonFeature } from '@/types/types';
import { Box } from '@mui/material';

const SIZE = 40;
const PADDING = 4;
const COLOR = '#d32f2f';

type Position = [number, number];

type Shape =
  | { kind: 'point'; position: Position }
  | { kind: 'line'; positions: Position[] }
  | { kind: 'polygon'; rings: Position[][] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPosition = (value: unknown): value is Position =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  typeof value[1] === 'number' &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

const toPositions = (value: unknown): Position[] => (Array.isArray(value) ? value.filter(isPosition) : []);

const toRings = (value: unknown): Position[][] =>
  Array.isArray(value) ? value.map(toPositions).filter((ring) => ring.length > 0) : [];

function toShapes(geometry: Record<string, unknown> | null): Shape[] {
  if (!geometry) return [];
  const { type, coordinates, geometries } = geometry;

  switch (type) {
    case 'Point':
      return isPosition(coordinates) ? [{ kind: 'point', position: coordinates }] : [];
    case 'MultiPoint':
      return toPositions(coordinates).map((position) => ({ kind: 'point', position }));
    case 'LineString': {
      const positions = toPositions(coordinates);
      return positions.length > 0 ? [{ kind: 'line', positions }] : [];
    }
    case 'MultiLineString':
      return toRings(coordinates).map((positions) => ({ kind: 'line', positions }));
    case 'Polygon': {
      const rings = toRings(coordinates);
      return rings.length > 0 ? [{ kind: 'polygon', rings }] : [];
    }
    case 'MultiPolygon':
      return Array.isArray(coordinates)
        ? coordinates
          .map(toRings)
          .filter((rings) => rings.length > 0)
          .map((rings) => ({ kind: 'polygon', rings }))
        : [];
    case 'GeometryCollection':
      return Array.isArray(geometries) ? geometries.filter(isRecord).flatMap(toShapes) : [];
    default:
      return [];
  }
}

function allPositions(shapes: Shape[]): Position[] {
  return shapes.flatMap((shape) => {
    if (shape.kind === 'point') return [shape.position];
    if (shape.kind === 'line') return shape.positions;
    return shape.rings.flat();
  });
}

// Equirectangular projection with longitude scaled by cos(latitude), fitted and centred in the square.
function createProjector(positions: Position[]) {
  const lons = positions.map(([lon]) => lon);
  const lats = positions.map(([, lat]) => lat);
  const minLon = Math.min(...lons);
  const maxLat = Math.max(...lats);
  const minLat = Math.min(...lats);
  const maxLon = Math.max(...lons);

  const cosLat = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const width = (maxLon - minLon) * cosLat;
  const height = maxLat - minLat;
  const span = Math.max(width, height) || 1;
  const scale = (SIZE - PADDING * 2) / span;
  const offsetX = (SIZE - width * scale) / 2;
  const offsetY = (SIZE - height * scale) / 2;

  return ([lon, lat]: Position): [number, number] => [
    offsetX + (lon - minLon) * cosLat * scale,
    offsetY + (maxLat - lat) * scale,
  ];
}

function linePath(points: [number, number][], closed: boolean): string {
  const segments = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  return closed ? `${segments.join('')}Z` : segments.join('');
}

type GeoJsonFeaturePreviewProps = {
  feature: GeoJsonFeature;
};

export default function GeoJsonFeaturePreview({ feature }: GeoJsonFeaturePreviewProps) {
  const style = readFeatureStyle(feature.properties);
  const fill = style.fill ?? COLOR;
  const stroke = style.stroke ?? COLOR;
  const shapes = toShapes(feature.geometry);
  const positions = allPositions(shapes);
  const project = positions.length > 0 ? createProjector(positions) : null;

  return (
    <Box
      component="svg"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      aria-hidden="true"
      sx={{ flexShrink: 0, borderRadius: 1, bgcolor: 'action.hover' }}
    >
      {project &&
        shapes.map((shape, index) => {
          if (shape.kind === 'point') {
            const [x, y] = project(shape.position);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={2.5}
                fill={fill}
                fillOpacity={style.fillOpacity}
                stroke={style.stroke ?? '#ffffff'}
                strokeOpacity={style.strokeOpacity}
                strokeWidth={1}
              />
            );
          }
          if (shape.kind === 'line') {
            return (
              <path
                key={index}
                d={linePath(shape.positions.map(project), false)}
                fill="none"
                stroke={stroke}
                strokeOpacity={style.strokeOpacity}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          }
          return (
            <path
              key={index}
              d={shape.rings.map((ring) => linePath(ring.map(project), true)).join('')}
              fill={fill}
              fillOpacity={style.fillOpacity ?? 0.3}
              stroke={stroke}
              strokeOpacity={style.strokeOpacity}
              strokeWidth={1}
              fillRule="evenodd"
            />
          );
        })}
    </Box>
  );
}
