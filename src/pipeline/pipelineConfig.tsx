/* eslint-disable react-refresh/only-export-components */
import { ConnectionLineType, type Edge, type Node } from '@xyflow/react';

import AIPhotoEditorNode from '@/pipeline/nodes/ComplexNodes/AIPhotoEditorNode';
import ArraySetOperationNode from '@/pipeline/nodes/ComplexNodes/ArraySetOperationNode';
import ArraySwitchNode from '@/pipeline/nodes/ComplexNodes/ArraySwitchNode';
import AskAINode from '@/pipeline/nodes/ComplexNodes/AskAINode';
import GpsMapNode from '@/pipeline/nodes/ComplexNodes/GpsMapNode';
import GeoJsonInputNode from '@/pipeline/nodes/ComplexNodes/GeoJsonInputNode';
import GeoJsonViewerNode from '@/pipeline/nodes/ComplexNodes/GeoJsonViewerNode';
import GpsSplitNode from '@/pipeline/nodes/ComplexNodes/GpsSplitNode';
import GrouperNode from '@/pipeline/nodes/ComplexNodes/GrouperNode';
import HotFolderReadNode from '@/pipeline/nodes/ComplexNodes/HotFolderReadNode';
import HotFolderWriteNode from '@/pipeline/nodes/ComplexNodes/HotFolderWriteNode';
import SinglePhotoViewerNode from '@/pipeline/nodes/ComplexNodes/SinglePhotoViewerNode';
import SourceNode from '@/pipeline/nodes/ComplexNodes/SourceNode';
import ViewerNode from '@/pipeline/nodes/ComplexNodes/ViewerNode';

export const CONNECTION_LINE_TYPE = ConnectionLineType.SmoothStep;
export const INITIAL_NODES: Node[] = [];
export const INITIAL_EDGES: Edge[] = [];
export const SNAP_GRID: [number, number] = [20, 20];
export const LAST_PIPELINE_STORAGE_KEY = 'lastOpenedPipelineId';
export const PIPELINE_FILE_EXTENSION = '.cep';
export const PIPELINE_NODE_COUNT_EVENT = 'pipeline:node-count';
export const PIPELINE_NODE_COUNT_REQUEST_EVENT = 'pipeline:node-count-request';

export const pipelineNodeTypes = {
  'ai-photo-editor': AIPhotoEditorNode,
  'array-and-not': ArraySetOperationNode,
  'array-and': ArraySetOperationNode,
  'array-or': ArraySetOperationNode,
  'array-switch': ArraySwitchNode,
  'ask-ai': AskAINode,
  'geojson-input': GeoJsonInputNode,
  'geojson-viewer': GeoJsonViewerNode,
  'gps-map': GpsMapNode,
  'gps-split': GpsSplitNode,
  'hot-folder-read': HotFolderReadNode,
  'hot-folder-write': HotFolderWriteNode,
  'viewer-single': SinglePhotoViewerNode,
  grouper: GrouperNode,
  source: SourceNode,
  viewer: ViewerNode,
};
