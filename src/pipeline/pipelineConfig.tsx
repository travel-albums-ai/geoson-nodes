/* eslint-disable react-refresh/only-export-components */
import { ConnectionLineType, type Edge, type Node } from '@xyflow/react';

import GpsMapNode from '@/pipeline/nodes/ComplexNodes/GpsMapNode';
import GeoJsonInputNode from '@/pipeline/nodes/ComplexNodes/GeoJsonInputNode';
import GeoJsonViewerNode from '@/pipeline/nodes/ComplexNodes/GeoJsonViewerNode';

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
};
