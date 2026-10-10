import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

// Caps the routes returned and the flight checks made, so a long list of optional stops cannot freeze the pipeline.
// The search keeps only the cheapest routes, so memory stays flat and a larger step budget only costs time.
const MAX_ROUTES = 1000;
const MAX_STEPS = 5_000_000;

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

type Found = { unranked: number; price: number; legs: Leg[] };

// Finds routes from start to goal that visit each airport at most once, cheapest first. It is a depth-first search
// with branch and bound: it follows each flight in turn, and drops a partial route as soon as no completion of it can
// beat the MAX_ROUTES cheapest routes found so far. Memory is the current path plus the kept routes, so it does not
// grow with the number of partial routes; a long search only takes longer. Flights are one-way, so each leg is only
// followed from its departure to its arrival airport. A route ends as soon as it reaches the goal, so a round trip
// (start equal to goal) returns to the start only once. Each parallel flight is a separate leg, so it yields its own routes.
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

  // Cheapest flights first, so the first complete routes found are usually among the cheapest.
  const rank = (leg: Leg): number => (isRankable(leg.price) ? leg.price : Number.MAX_VALUE);
  for (const next of outgoing.values()) {
    next.sort((a, b) => rank(a) - rank(b));
  }

  const kept: Found[] = [];
  const isBetter = (unrankedA: number, priceA: number, unrankedB: number, priceB: number): boolean =>
    unrankedA < unrankedB || (unrankedA === unrankedB && priceA < priceB);

  // Whether a complete route with this key would enter the kept list.
  const admits = (unranked: number, price: number): boolean => {
    if (kept.length < MAX_ROUTES) return true;
    const last = kept[kept.length - 1];
    return isBetter(unranked, price, last.unranked, last.price);
  };

  const insert = (found: Found): void => {
    let i = kept.length;
    while (i > 0 && isBetter(found.unranked, found.price, kept[i - 1].unranked, kept[i - 1].price)) i--;
    kept.splice(i, 0, found);
    if (kept.length > MAX_ROUTES) kept.pop();
  };

  // A partial route can be dropped once none of its completions can enter the kept list. Its unranked count can
  // only grow, and while it stays the same, its price can only grow to at least the bound (the price so far plus
  // the cheapest remaining price, which ignores currency and the stop rules, so it is a true lower bound).
  const hopeless = (unranked: number, bound: number): boolean => {
    if (kept.length < MAX_ROUTES) return false;
    const last = kept[kept.length - 1];
    return unranked > last.unranked || (unranked === last.unranked && bound >= last.price);
  };

  const visited = new Set<string>([start]);
  const path: Leg[] = [];
  let steps = 0;

  // `currency` is undefined until the first ranked leg, then the currency every ranked leg must share.
  const extend = (node: string, unranked: number, price: number, currency: string | null | undefined): void => {
    for (const leg of outgoing.get(node) ?? []) {
      if (steps >= MAX_STEPS) return;
      steps++;

      if (leg.to !== goal && (!toGoal.has(leg.to) || visited.has(leg.to))) continue;

      const ranked = isRankable(leg.price) && (currency === undefined || currency === leg.currency);
      const nextUnranked = unranked + (ranked ? 0 : 1);
      const nextPrice = ranked ? price + (leg.price ?? 0) : price;
      const nextCurrency = ranked ? leg.currency : currency;

      path.push(leg);
      if (leg.to === goal) {
        if (admits(nextUnranked, nextPrice)) insert({ unranked: nextUnranked, price: nextPrice, legs: [...path] });
      } else if (!hopeless(nextUnranked, nextPrice + (toGoal.get(leg.to) ?? 0))) {
        visited.add(leg.to);
        extend(leg.to, nextUnranked, nextPrice, nextCurrency);
        visited.delete(leg.to);
      }
      path.pop();
    }
  };

  extend(start, 0, 0, undefined);
  return kept.map((found) => found.legs);
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
