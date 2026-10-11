// Converts Garmin FIT activity files into GeoJSON FeatureCollections using the
// official FIT SDK. Each file becomes one collection holding the GPS track and
// its start and finish points.

import type { GeoJsonFeature, GeoJsonFeatureCollection } from '@/types/types';
import { Decoder, Stream, type RecordMesg, type SessionMesg } from '@garmin/fitsdk';

const SOURCE = 'Garmin FIT';

// FIT stores GPS positions as signed 32-bit semicircles.
const SEMICIRCLES_TO_DEGREES = 180 / 2 ** 31;

type Coordinate = [number, number];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toCoordinate(record: RecordMesg): Coordinate | undefined {
  const { positionLat, positionLong } = record;
  if (!isFiniteNumber(positionLat) || !isFiniteNumber(positionLong)) return undefined;

  const lat = positionLat * SEMICIRCLES_TO_DEGREES;
  const lon = positionLong * SEMICIRCLES_TO_DEGREES;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;

  return [lon, lat];
}

function toIsoString(value: unknown): string | undefined {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : undefined;
}

// A file can hold several sessions (e.g. multisport). Totals are summed across them.
function sumSessions(sessions: SessionMesg[], pick: (session: SessionMesg) => unknown): number | undefined {
  const values = sessions.map(pick).filter(isFiniteNumber);
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) : undefined;
}

function withoutUndefined(properties: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

function pointFeature(coordinate: Coordinate, name: string, kind: 'start' | 'finish'): GeoJsonFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: coordinate },
    properties: { name, kind },
  };
}

export function parseFitFile(buffer: ArrayBuffer, fileName: string): GeoJsonFeatureCollection {
  const decoder = new Decoder(Stream.fromArrayBuffer(buffer));

  if (!decoder.isFIT()) {
    throw new Error(`${fileName} is not a FIT file`);
  }
  if (!decoder.checkIntegrity()) {
    throw new Error(`${fileName} failed the FIT integrity check`);
  }

  const { messages, errors } = decoder.read({ applyScaleAndOffset: true });
  if (errors.length > 0) {
    throw new Error(`${fileName} could not be decoded: ${errors[0].message}`);
  }

  const sessions = messages.sessionMesgs ?? [];
  const first = sessions[0];
  const coordinates = (messages.recordMesgs ?? []).map(toCoordinate).filter((c): c is Coordinate => c !== undefined);

  const features: GeoJsonFeature[] = [];

  if (coordinates.length > 0) {
    features.push({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates },
      properties: withoutUndefined({
        name: fileName,
        kind: 'track',
        sport: first?.sport,
        startTime: toIsoString(first?.startTime),
        totalDistance: sumSessions(sessions, (session) => session.totalDistance),
        totalTimerTime: sumSessions(sessions, (session) => session.totalTimerTime),
        totalAscent: sumSessions(sessions, (session) => session.totalAscent),
        totalDescent: sumSessions(sessions, (session) => session.totalDescent),
        totalCalories: sumSessions(sessions, (session) => session.totalCalories),
        avgHeartRate: first?.avgHeartRate,
        maxHeartRate: first?.maxHeartRate,
      }),
    });

    features.push(pointFeature(coordinates[0], `${fileName} start`, 'start'));
    features.push(pointFeature(coordinates[coordinates.length - 1], `${fileName} finish`, 'finish'));
  }

  return {
    type: 'FeatureCollection',
    city: fileName,
    source: SOURCE,
    features,
  };
}
