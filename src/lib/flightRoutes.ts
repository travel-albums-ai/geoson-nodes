import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

// Stops the search after this many routes or steps, so a long list of optional stops cannot freeze the pipeline.
const MAX_ROUTES = 1000;
const MAX_STEPS = 200_000;

// A flight line from the flight path node, read as one leg of the route network.
type Leg = { feature: GeoJsonFeature; from: string; to: string };

// Keeps only LineString features that carry from/to IATA codes, as the flight path node writes them.
function readLegs(collections: GeoJsonFeatureCollectionArray): Leg[] {
  const legs: Leg[] = [];

  for (const collection of collections) {
    for (const feature of collection.features) {
      const { geometry, properties } = feature;
      const from = properties?.from;
      const to = properties?.to;

      if (geometry?.type !== 'LineString') continue;
      if (typeof from !== 'string' || typeof to !== 'string' || from === to) continue;

      legs.push({ feature, from, to });
    }
  }

  return legs;
}

// Finds every route from start to goal that visits each airport at most once. Flights are
// one-way, so each leg is only followed from its departure to its arrival airport. A route
// ends as soon as it reaches the goal, so a round trip (start equal to goal) returns to the
// start only once. Each parallel flight is a separate leg, so it yields its own routes.
function findRoutes(legs: Leg[], start: string, goal: string): Leg[][] {
  const outgoing = new Map<string, Leg[]>();
  const incoming = new Map<string, string[]>();
  for (const leg of legs) {
    const next = outgoing.get(leg.from) ?? [];
    next.push(leg);
    outgoing.set(leg.from, next);
    const previous = incoming.get(leg.to) ?? [];
    previous.push(leg.from);
    incoming.set(leg.to, previous);
  }

  // Airports that can still reach the goal. Skipping the others keeps dead-end branches out of the search.
  const canReachGoal = new Set<string>([goal]);
  const pending = [goal];
  while (pending.length > 0) {
    for (const previous of incoming.get(pending.pop() ?? '') ?? []) {
      if (canReachGoal.has(previous)) continue;
      canReachGoal.add(previous);
      pending.push(previous);
    }
  }

  const routes: Leg[][] = [];
  const visited = new Set<string>([start]);
  const current: Leg[] = [];
  let steps = 0;

  const walk = (node: string) => {
    for (const leg of outgoing.get(node) ?? []) {
      if (routes.length >= MAX_ROUTES || steps >= MAX_STEPS) return;
      steps++;

      if (leg.to === goal) {
        routes.push([...current, leg]);
        continue;
      }
      if (visited.has(leg.to) || !canReachGoal.has(leg.to)) continue;

      visited.add(leg.to);
      current.push(leg);
      walk(leg.to);
      current.pop();
      visited.delete(leg.to);
    }
  };

  walk(start);
  return routes;
}


// Keeps every flight that lies on a route from one airport to another, as one combined collection.
// Intermediate stops are optional: a route may only pass through the listed airports, in any order,
// and may skip them. The start and end may be the same airport for a round trip through a stop.
// Returns an empty list when the airports are missing or no route connects them.
export function filterFlightRoutes(
  collections: GeoJsonFeatureCollectionArray,
  fromIata: string | undefined,
  toIata: string | undefined,
  viaIatas: readonly string[] = [],
): GeoJsonFeatureCollectionArray {
  if (!fromIata || !toIata) return [];

  const allowed = new Set([fromIata, toIata, ...viaIatas]);
  const legs = readLegs(collections).filter((leg) => allowed.has(leg.from) && allowed.has(leg.to));
  const routes = findRoutes(legs, fromIata, toIata);
  if (routes.length === 0) return [];

  const features = new Set<GeoJsonFeature>();
  for (const route of routes) {
    for (const leg of route) features.add(leg.feature);
  }

  return [{ type: 'FeatureCollection', source: 'Flight routes', features: [...features] }];
}
