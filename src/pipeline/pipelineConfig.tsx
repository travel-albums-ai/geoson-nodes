/* eslint-disable react-refresh/only-export-components */
import { ConnectionLineType, type Edge, type Node } from '@xyflow/react';

import GpsMapNode from '@/pipeline/nodes/ComplexNodes/GpsMapNode';
import GeoBoundsFilterNode from '@/pipeline/nodes/ComplexNodes/GeoBoundsFilterNode';
import FlightPathNode from '@/pipeline/nodes/ComplexNodes/FlightPathNode';
import ShortestRouteNode from '@/pipeline/nodes/ComplexNodes/ShortestRouteNode';
import GeoJsonInputNode from '@/pipeline/nodes/ComplexNodes/GeoJsonInputNode';
import GeoJsonJsonataNode from '@/pipeline/nodes/ComplexNodes/GeoJsonJsonataNode';
import GeoJsonMergeNode from '@/pipeline/nodes/ComplexNodes/GeoJsonMergeNode';
import GeoJsonSetNode from '@/pipeline/nodes/ComplexNodes/GeoJsonSetNode';
import GeoJsonStyleNode from '@/pipeline/nodes/ComplexNodes/GeoJsonStyleNode';
import GeoJsonSwitchNode from '@/pipeline/nodes/ComplexNodes/GeoJsonSwitchNode';
import GeoJsonViewerNode from '@/pipeline/nodes/ComplexNodes/GeoJsonViewerNode';
import GeoJsonWithinAreaNode from '@/pipeline/nodes/ComplexNodes/GeoJsonWithinAreaNode';
import GeoJsonZipNode from '@/pipeline/nodes/ComplexNodes/GeoJsonZipNode';
import PostItNode from '@/pipeline/nodes/ComplexNodes/PostItNode';

export const CONNECTION_LINE_TYPE = ConnectionLineType.SmoothStep;
export const INITIAL_NODES: Node[] = [];
export const INITIAL_EDGES: Edge[] = [];
export const SNAP_GRID: [number, number] = [20, 20];
export const LAST_PIPELINE_STORAGE_KEY = 'lastOpenedPipelineId';
export const PIPELINE_FILE_EXTENSION = '.cep';
export const PIPELINE_NODE_COUNT_EVENT = 'pipeline:node-count';
export const PIPELINE_NODE_COUNT_REQUEST_EVENT = 'pipeline:node-count-request';

export const pipelineNodeTypes = {
  'geojson-input': GeoJsonInputNode,
  'geojson-viewer': GeoJsonViewerNode,
  'gps-map': GpsMapNode,
  'geo-bounds-filter': GeoBoundsFilterNode,
  'geojson-within-area': GeoJsonWithinAreaNode,
  'geojson-merge': GeoJsonMergeNode,
  'flight-path': FlightPathNode,
  'shortest-route': ShortestRouteNode,
  'geojson-switch': GeoJsonSwitchNode,
  'geojson-style': GeoJsonStyleNode,
  'geojson-zip': GeoJsonZipNode,
  'geojson-union': GeoJsonSetNode,
  'geojson-intersection': GeoJsonSetNode,
  'geojson-difference': GeoJsonSetNode,
  'geojson-symmetric-difference': GeoJsonSetNode,
  'geojson-jsonata': GeoJsonJsonataNode,
  'post-it': PostItNode,
};
