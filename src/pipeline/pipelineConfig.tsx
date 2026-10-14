/* eslint-disable react-refresh/only-export-components */
import { ConnectionLineType, type Edge, type Node } from '@xyflow/react';

import { POPUP_PIPELINE_PARAM } from '@/lib/pipelinePopup';
import FitInputNode from '@/pipeline/nodes/ComplexNodes/FitInputNode';
import FlightPathNode from '@/pipeline/nodes/ComplexNodes/FlightPathNode';
import GeoBoundsFilterNode from '@/pipeline/nodes/ComplexNodes/GeoBoundsFilterNode';
import GeoJsonInputNode from '@/pipeline/nodes/ComplexNodes/GeoJsonInputNode';
import GeoJsonJsonataNode from '@/pipeline/nodes/ComplexNodes/GeoJsonJsonataNode';
import GeoJsonMergeNode from '@/pipeline/nodes/ComplexNodes/GeoJsonMergeNode';
import GeoJsonSetNode from '@/pipeline/nodes/ComplexNodes/GeoJsonSetNode';
import GeoJsonStyleNode from '@/pipeline/nodes/ComplexNodes/GeoJsonStyleNode';
import GeoJsonHeatmapNode from '@/pipeline/nodes/ComplexNodes/GeoJsonHeatmapNode';
import AskGptNode from '@/pipeline/nodes/ComplexNodes/AskGptNode';
import GeoJsonChartNode from '@/pipeline/nodes/ComplexNodes/GeoJsonChartNode';
import GeoJsonSwitchNode from '@/pipeline/nodes/ComplexNodes/GeoJsonSwitchNode';
import GeoJsonViewerNode from '@/pipeline/nodes/ComplexNodes/GeoJsonViewerNode';
import GeoJsonFirstFeatureNode from '@/pipeline/nodes/ComplexNodes/GeoJsonFirstFeatureNode';
import GeoJsonWithinAreaNode from '@/pipeline/nodes/ComplexNodes/GeoJsonWithinAreaNode';
import GeoJsonZipNode from '@/pipeline/nodes/ComplexNodes/GeoJsonZipNode';
import GeoJsonFeaturePickerNode from '@/pipeline/nodes/ComplexNodes/GeoJsonFeaturePickerNode';
import UrlGeoJsonLoaderNode from '@/pipeline/nodes/ComplexNodes/UrlGeoJsonLoaderNode';
import GdeltEventsLoaderNode from '@/pipeline/nodes/ComplexNodes/GdeltEventsLoaderNode';
import QleverSparqlLoaderNode from '@/pipeline/nodes/ComplexNodes/QleverSparqlLoaderNode';
import OpenMeteoLoaderNode from '@/pipeline/nodes/ComplexNodes/OpenMeteoLoaderNode';
import GpsMapNode from '@/pipeline/nodes/ComplexNodes/GpsMapNode';
import PostItNode from '@/pipeline/nodes/ComplexNodes/PostItNode';
import ShortestRouteNode from '@/pipeline/nodes/ComplexNodes/ShortestRouteNode';
import IframeNode from '@/pipeline/nodes/ComplexNodes/IframeNode';
import GeoJsonBroadcastNode from '@/pipeline/nodes/ComplexNodes/GeoJsonBroadcastNode';
import GeoJsonReceiverNode from '@/pipeline/nodes/ComplexNodes/GeoJsonReceiverNode';

export const EDGE_TYPE = ConnectionLineType.Bezier;
export const INITIAL_NODES: Node[] = [];
export const INITIAL_EDGES: Edge[] = [];
export const SNAP_GRID: [number, number] = [20, 20];
// Stored in sessionStorage (per tab). Older builds kept it in localStorage, shared by all tabs.
export const LAST_PIPELINE_STORAGE_KEY = 'lastOpenedPipelineId';

export function readLastOpenedPipelineId(): string {
  try {
    localStorage.removeItem(LAST_PIPELINE_STORAGE_KEY);
    const url = new URL(window.location.href);
    const popupPipelineId = url.searchParams.get(POPUP_PIPELINE_PARAM);
    if (popupPipelineId) {
      url.searchParams.delete(POPUP_PIPELINE_PARAM);
      window.history.replaceState(window.history.state, '', url);
      sessionStorage.setItem(LAST_PIPELINE_STORAGE_KEY, popupPipelineId);
      return popupPipelineId;
    }
    return sessionStorage.getItem(LAST_PIPELINE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeLastOpenedPipelineId(pipelineId: string | null) {
  try {
    if (pipelineId) sessionStorage.setItem(LAST_PIPELINE_STORAGE_KEY, pipelineId);
    else sessionStorage.removeItem(LAST_PIPELINE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode, quota); the pipeline still works without restore.
  }
}
export const PIPELINE_FILE_EXTENSION = '.cep';
export const PIPELINE_NODE_COUNT_EVENT = 'pipeline:node-count';
export const PIPELINE_NODE_COUNT_REQUEST_EVENT = 'pipeline:node-count-request';

export const pipelineNodeTypes = {
  'geojson-input': GeoJsonInputNode,
  'geojson-viewer': GeoJsonViewerNode,
  'geojson-first-feature': GeoJsonFirstFeatureNode,
  'geojson-chart': GeoJsonChartNode,
  'ask-gpt': AskGptNode,
  'gps-map': GpsMapNode,
  'geo-bounds-filter': GeoBoundsFilterNode,
  'geojson-within-area': GeoJsonWithinAreaNode,
  'geojson-merge': GeoJsonMergeNode,
  'flight-path': FlightPathNode,
  'url-geojson-loader': UrlGeoJsonLoaderNode,
  'gdelt-events-loader': GdeltEventsLoaderNode,
  'qlever-sparql-loader': QleverSparqlLoaderNode,
  'open-meteo-loader': OpenMeteoLoaderNode,
  'fit-input': FitInputNode,
  'shortest-route': ShortestRouteNode,
  'geojson-switch': GeoJsonSwitchNode,
  'geojson-style': GeoJsonStyleNode,
  'geojson-heatmap': GeoJsonHeatmapNode,
  'geojson-zip': GeoJsonZipNode,
  'geojson-feature-picker': GeoJsonFeaturePickerNode,
  'geojson-union': GeoJsonSetNode,
  'geojson-intersection': GeoJsonSetNode,
  'geojson-difference': GeoJsonSetNode,
  'geojson-symmetric-difference': GeoJsonSetNode,
  'geojson-jsonata': GeoJsonJsonataNode,
  'post-it': PostItNode,
  'iframe': IframeNode,
  'geojson-broadcast': GeoJsonBroadcastNode,
  'geojson-receiver': GeoJsonReceiverNode,
};
