import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

// Stops the search after this many routes or steps, so a long list of optional stops cannot freeze the pipeline.
const MAX_ROUTES = 1000;
const MAX_STEPS = 200_000;

// A flight line from the flight path node, read as one leg of the route network.
type Leg = { feature: GeoJsonFeature; from: string; to: string; price: number | null; currency: string | null };

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

      legs.push({
        feature,
        from,
        to,
        price: readNumber(properties?.price),
        currency: readString(properties?.currency),
      });
    }
  }

  return legs;
}

// Only a non-negative price can be summed. Non-negative costs are what let the search pop routes in price order.
function isRankable(price: number | null): price is number {
  return price !== null && price >= 0;
}

// One partial route in the search. Labels point back to their parent, so routes share their prefixes.
// `visited` is a bit set of the airports the partial route has already passed through, and `remaining`
// is the cheapest price from the current airport to the goal, ignoring the stop rules.
type Label = {
  node: string;
  leg: Leg | null;
  parent: Label | null;
  visited: bigint;
  unranked: number;
  price: number;
  remaining: number;
  currency: string | null | undefined;
  seq: number;
};

// Orders partial routes by how cheaply they can finish: fewest unpriced legs first, then the lowest price
// so far plus the cheapest possible rest of the route. The sequence number keeps ties in discovery order.
function compareLabels(a: Label, b: Label): number {
  return a.unranked - b.unranked || a.price + a.remaining - (b.price + b.remaining) || a.seq - b.seq;
}

// Binary min-heap that orders the partial routes waiting to be extended.
class MinHeap<T> {
  private items: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  get size(): number {
    return this.items.length;
  }

  push(item: T): void {
    const items = this.items;
    items.push(item);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(items[i], items[parent]) >= 0) break;
      [items[i], items[parent]] = [items[parent], items[i]];
      i = parent;
    }
  }

  pop(): T | undefined {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (last !== undefined && items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < items.length && this.compare(items[left], items[smallest]) < 0) smallest = left;
        if (right < items.length && this.compare(items[right], items[smallest]) < 0) smallest = right;
        if (smallest === i) break;
        [items[i], items[smallest]] = [items[smallest], items[i]];
        i = smallest;
      }
    }
    return top;
  }
}

function legsOf(label: Label): Leg[] {
  const legs: Leg[] = [];
  for (let current: Label | null = label; current?.leg; current = current.parent) {
    legs.push(current.leg);
  }
  return legs.reverse();
}

// Finds routes from start to goal that visit each airport at most once, cheapest first. It is a Dijkstra-style
// best-first search: partial routes wait in a priority queue keyed by their cost so far plus the cheapest possible
// rest of the trip (an A* estimate), so the first complete routes to leave the queue are the cheapest. Flights are
// one-way, so each leg is only followed from its departure to its arrival airport. A route ends as soon as it
// reaches the goal, so a round trip (start equal to goal) returns to the start only once. Each parallel flight is a
// separate leg, so it yields its own routes.
function findRoutes(legs: Leg[], start: string, goal: string): Leg[][] {
  const outgoing = new Map<string, Leg[]>();
  const reverse = new Map<string, Leg[]>();
  for (const leg of legs) {
    const next = outgoing.get(leg.from) ?? [];
    next.push(leg);
    outgoing.set(leg.from, next);
    const previous = reverse.get(leg.to) ?? [];
    previous.push(leg);
    reverse.set(leg.to, previous);
  }

  // Cheapest price from each airport to the goal, ignoring the stop rules. Unpriced legs count as free,
  // so this never overestimates what a route still costs. Airports that cannot reach the goal are left out,
  // which keeps dead-end branches out of the search.
  const toGoal = new Map<string, number>([[goal, 0]]);
  const frontier = new MinHeap<{ airport: string; distance: number }>((a, b) => a.distance - b.distance);
  frontier.push({ airport: goal, distance: 0 });
  for (let entry = frontier.pop(); entry; entry = frontier.pop()) {
    if (entry.distance > (toGoal.get(entry.airport) ?? Infinity)) continue;
    for (const leg of reverse.get(entry.airport) ?? []) {
      const distance = entry.distance + (isRankable(leg.price) ? leg.price : 0);
      if (distance >= (toGoal.get(leg.from) ?? Infinity)) continue;
      toGoal.set(leg.from, distance);
      frontier.push({ airport: leg.from, distance });
    }
  }

  const bits = new Map<string, bigint>();
  const bitOf = (node: string): bigint => {
    let bit = bits.get(node);
    if (bit === undefined) {
      bit = BigInt(1) << BigInt(bits.size);
      bits.set(node, bit);
    }
    return bit;
  };

  // Partial routes that reach the same airport, having passed the same airports and holding the same
  // currency, can be extended in exactly the same ways. Only the cheapest MAX_ROUTES of each such state
  // can be part of the cheapest MAX_ROUTES complete routes, so the rest are not extended.
  const expansions = new Map<string, number>();
  const queue = new MinHeap<Label>(compareLabels);
  let seq = 0;
  queue.push({
    node: start,
    leg: null,
    parent: null,
    visited: bitOf(start),
    unranked: 0,
    price: 0,
    remaining: toGoal.get(start) ?? 0,
    currency: undefined,
    seq: seq++,
  });

  const routes: Leg[][] = [];
  let steps = 0;

  while (queue.size > 0 && routes.length < MAX_ROUTES && steps < MAX_STEPS) {
    const label = queue.pop();
    if (!label) break;

    if (label.leg && label.node === goal) {
      routes.push(legsOf(label));
      continue;
    }

    const currencyKey = label.currency === undefined ? 'unset' : JSON.stringify(label.currency);
    const state = `${label.node}|${label.visited}|${currencyKey}`;
    const count = expansions.get(state) ?? 0;
    if (count >= MAX_ROUTES) continue;
    expansions.set(state, count + 1);

    for (const leg of outgoing.get(label.node) ?? []) {
      if (steps >= MAX_STEPS) break;
      steps++;

      if (leg.to !== goal && (!toGoal.has(leg.to) || (label.visited & bitOf(leg.to)) !== BigInt(0))) continue;

      const ranked =
        isRankable(leg.price) && (label.currency === undefined || label.currency === leg.currency);
      queue.push({
        node: leg.to,
        leg,
        parent: label,
        visited: label.visited | bitOf(leg.to),
        unranked: label.unranked + (ranked ? 0 : 1),
        price: label.price + (ranked ? (leg.price ?? 0) : 0),
        remaining: toGoal.get(leg.to) ?? 0,
        currency: ranked ? leg.currency : label.currency,
        seq: seq++,
      });
    }
  }

  return routes;
}


function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

// Chains the legs of one route into a single feature. The total price is only set when every leg has
// a price in the same currency; mixed or missing prices leave it null rather than adding them up wrongly.
function buildRouteFeature(route: Leg[]): GeoJsonFeature {
  const legs = route.map(({ feature }) => {
    const properties = feature.properties ?? {};
    return {
      from: readString(properties.from),
      to: readString(properties.to),
      price: readNumber(properties.price),
      currency: readString(properties.currency),
      date: readString(properties.date),
      extraText: readString(properties.extraText),
    };
  });

  const airports = [legs[0].from, ...legs.map((leg) => leg.to)];
  const currencies = new Set(legs.map((leg) => leg.currency));
  const currency = currencies.size === 1 ? [...currencies][0] : null;
  const prices = legs.map((leg) => leg.price);
  const totalPrice =
    currencies.size === 1 && prices.every(isRankable)
      ? Math.round(prices.reduce((sum, price) => sum + (price ?? 0), 0) * 100) / 100
      : null;


  const priceText = totalPrice === null ? null : [totalPrice, currency].filter(Boolean).join(' ');
  const name = airports.join(' > ') + (priceText ? ` · ${priceText}` : '');
  const tooltip = [name, `${legs.length} ${legs.length === 1 ? 'flight' : 'flights'}`, priceText]
    .filter((part) => part !== null && part !== '')
    .join(' · ');

  return {
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates: route.map(({ feature }) => feature.geometry?.coordinates ?? []) },
    properties: {
      name,
      kind: 'route',
      airports,
      legCount: legs.length,
      legs,
      totalPrice,
      currency,
      tooltip,
    },
  };
}

// Returns one feature per viable route from one airport to another, cheapest first, as a single collection.
// Intermediate stops are optional: a route may only pass through the listed airports, in any order,
// and may skip them. The start and end may be the same airport for a round trip through a stop.
// Routes with an unpriced or mixed-currency flight are listed after the fully priced ones.
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

  return [{ type: 'FeatureCollection', source: 'Flight routes', features: routes.map(buildRouteFeature) }];
}
