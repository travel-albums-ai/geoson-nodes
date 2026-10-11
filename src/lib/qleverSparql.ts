import type { GeoJsonFeature, GeoJsonFeatureCollectionArray } from '@/types/types';

export const QLEVER_OSM_PLANET_ENDPOINT = 'https://qlever.dev/api/osm-planet';

export const DEFAULT_QLEVER_QUERY = `PREFIX osmkey: <https://www.openstreetmap.org/wiki/Key:>
PREFIX geo: <http://www.opengis.net/ont/geosparql#>

SELECT ?name ?wkt WHERE {
  ?osm_id osmkey:tourism "museum" .
  ?osm_id osmkey:name ?name .
  ?osm_id geo:hasGeometry/geo:asWKT ?wkt .
}
LIMIT 100`;

export type SparqlTerm = { type: string; value: string; datatype?: string };

// Subset of https://www.w3.org/TR/sparql11-results-json/ that the converter reads.
export type SparqlJsonResults = {
  head: { vars: string[] };
  results: { bindings: Array<Record<string, SparqlTerm>> };
};

const ERROR_MESSAGE_MAX_LENGTH = 300;

async function qleverErrorMessage(response: Response): Promise<string> {
  const fallback = `QLever request failed with HTTP ${response.status}`;

  try {
    const body = await response.json() as { exception?: unknown };
    if (typeof body.exception !== 'string') return fallback;

    const detail = body.exception.length > ERROR_MESSAGE_MAX_LENGTH
      ? `${body.exception.slice(0, ERROR_MESSAGE_MAX_LENGTH)}…`
      : body.exception;
    return `${fallback}: ${detail}`;
  } catch {
    return fallback;
  }
}

export async function runQleverSparql(query: string): Promise<SparqlJsonResults> {
  const response = await fetch(QLEVER_OSM_PLANET_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/sparql-results+json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ query }),
  });

  if (!response.ok) {
    throw new Error(await qleverErrorMessage(response));
  }

  return await response.json() as SparqlJsonResults;
}

type Coordinate = [number, number];

const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';
// EPSG:4326 is latitude-first, so its ordinates are swapped into GeoJSON's longitude-first order.
const EPSG_4326 = 'http://www.opengis.net/def/crs/EPSG/0/4326';

const TOKEN_PATTERN = /\s*(\(|\)|,|[A-Za-z]+|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?)/y;
const NUMBER_PATTERN = /^[-+]?(\d|\.\d)/;
const TYPE_PATTERN = /^(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)(ZM|Z|M)?$/i;
const DIMENSION_PATTERN = /^(ZM|Z|M)$/i;

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let position = 0;

  while (position < text.length) {
    TOKEN_PATTERN.lastIndex = position;
    const match = TOKEN_PATTERN.exec(text);
    if (!match) {
      if (text.slice(position).trim() === '') break;
      throw new Error(`Unexpected WKT input at position ${position}`);
    }
    tokens.push(match[1]);
    position = TOKEN_PATTERN.lastIndex;
  }

  return tokens;
}

// Recursive-descent reader for WKT as defined by OGC 06-103r4, including the
// optional IRI prefix used by GeoSPARQL literals (<http://...CRS84> POINT(...)).
class WktReader {
  private readonly tokens: string[];
  private readonly swapAxes: boolean;
  private index = 0;

  constructor(text: string) {
    let body = text.trim();
    let swapAxes = false;

    const crs = /^<([^>]*)>\s*/.exec(body);
    if (crs) {
      if (crs[1] === EPSG_4326) {
        swapAxes = true;
      } else if (crs[1] !== CRS84) {
        throw new Error(`Unsupported CRS ${crs[1]}`);
      }
      body = body.slice(crs[0].length);
    }

    this.swapAxes = swapAxes;
    this.tokens = tokenize(body);
  }

  end(): void {
    if (this.index !== this.tokens.length) {
      throw new Error('Unexpected trailing WKT input');
    }
  }

  geometry(): Record<string, unknown> | null {
    const match = TYPE_PATTERN.exec(this.next());
    if (!match) throw new Error('Unsupported WKT geometry type');

    const type = match[1].toUpperCase();
    if (!match[2] && DIMENSION_PATTERN.test(this.peek() ?? '')) this.next();
    if (this.peek()?.toUpperCase() === 'EMPTY') {
      this.next();
      return null;
    }

    switch (type) {
      case 'POINT':
        return { type: 'Point', coordinates: this.parenthesizedCoordinate() };
      case 'LINESTRING':
        return { type: 'LineString', coordinates: this.list(() => this.coordinate()) };
      case 'POLYGON':
        return { type: 'Polygon', coordinates: this.list(() => this.lineString()) };
      case 'MULTIPOINT':
        return { type: 'MultiPoint', coordinates: this.list(() => this.multiPointMember()) };
      case 'MULTILINESTRING':
        return { type: 'MultiLineString', coordinates: this.list(() => this.lineString()) };
      case 'MULTIPOLYGON':
        return { type: 'MultiPolygon', coordinates: this.list(() => this.list(() => this.lineString())) };
      case 'GEOMETRYCOLLECTION':
        return {
          type: 'GeometryCollection',
          geometries: this.list(() => this.geometry()).filter((member): member is Record<string, unknown> => member !== null),
        };
      default:
        throw new Error(`Unsupported WKT geometry type ${type}`);
    }
  }

  private peek(): string | undefined {
    return this.tokens[this.index];
  }

  private next(): string {
    const token = this.tokens[this.index];
    if (token === undefined) throw new Error('Unexpected end of WKT input');
    this.index += 1;
    return token;
  }

  private expect(expected: string): void {
    if (this.next() !== expected) throw new Error(`Expected "${expected}" in WKT input`);
  }

  private list<T>(item: () => T): T[] {
    this.expect('(');
    const items = [item()];
    while (this.peek() === ',') {
      this.next();
      items.push(item());
    }
    this.expect(')');
    return items;
  }

  private lineString(): Coordinate[] {
    return this.list(() => this.coordinate());
  }

  // MULTIPOINT accepts both "MULTIPOINT (1 2, 3 4)" and "MULTIPOINT ((1 2), (3 4))".
  private multiPointMember(): Coordinate {
    if (this.peek() !== '(') return this.coordinate();
    return this.parenthesizedCoordinate();
  }

  private parenthesizedCoordinate(): Coordinate {
    this.expect('(');
    const coordinate = this.coordinate();
    this.expect(')');
    return coordinate;
  }

  // Dimension is taken from the first two ordinates; any Z or M values after them are dropped.
  private coordinate(): Coordinate {
    const ordinates: number[] = [];
    while (NUMBER_PATTERN.test(this.peek() ?? '')) {
      ordinates.push(Number(this.next()));
    }
    if (ordinates.length < 2) throw new Error('A WKT coordinate needs at least two ordinates');

    const [first, second] = ordinates;
    return this.swapAxes ? [second, first] : [first, second];
  }
}

// Returns the GeoJSON geometry for a WKT string, or null when it is EMPTY or cannot be parsed.
export function parseWkt(text: string): Record<string, unknown> | null {
  try {
    const reader = new WktReader(text);
    const geometry = reader.geometry();
    reader.end();
    return geometry;
  } catch {
    return null;
  }
}

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const NUMERIC_DATATYPES = new Set([
  'integer', 'decimal', 'double', 'float', 'int', 'long', 'short', 'byte',
  'nonNegativeInteger', 'positiveInteger', 'nonPositiveInteger', 'negativeInteger',
  'unsignedLong', 'unsignedInt', 'unsignedShort', 'unsignedByte',
].map((name) => `${XSD}${name}`));
const BOOLEAN_DATATYPE = `${XSD}boolean`;

function termValue(term: SparqlTerm): unknown {
  if (term.datatype && NUMERIC_DATATYPES.has(term.datatype) && term.value.trim() !== '') {
    const number = Number(term.value);
    if (Number.isFinite(number)) return number;
  }
  if (term.datatype === BOOLEAN_DATATYPE) {
    return term.value === 'true' || term.value === '1';
  }
  return term.value;
}

// Each row becomes one feature. Its geometry is the first bound literal that parses as WKT;
// the remaining bound variables become properties. Rows without geometry are skipped.
export function sparqlResultsToGeoJson(results: SparqlJsonResults): GeoJsonFeatureCollectionArray {
  const variables = results.head.vars;
  const bindings = results.results.bindings;
  const features: GeoJsonFeature[] = [];

  for (const binding of bindings) {
    let geometry: Record<string, unknown> | null = null;
    let geometryVariable: string | undefined;

    for (const variable of variables) {
      const term = binding[variable];
      if (!term || (term.type !== 'literal' && term.type !== 'typed-literal')) continue;

      geometry = parseWkt(term.value);
      if (geometry) {
        geometryVariable = variable;
        break;
      }
    }

    if (!geometry) continue;

    const properties: Record<string, unknown> = {};
    for (const variable of variables) {
      const term = binding[variable];
      if (term && variable !== geometryVariable) properties[variable] = termValue(term);
    }

    features.push({ type: 'Feature', geometry, properties });
  }

  if (features.length === 0 && bindings.length > 0) {
    throw new Error('No result row contains a WKT geometry. Select a variable that holds a geo:wktLiteral, for example ?wkt.');
  }

  return [{
    type: 'FeatureCollection',
    source: 'QLever OSM planet',
    url: QLEVER_OSM_PLANET_ENDPOINT,
    features,
  }];
}
