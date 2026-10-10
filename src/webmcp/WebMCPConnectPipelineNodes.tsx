import { usePipelineStore } from '@/context/pipelineStore';
import { EDGE_TYPE } from '@/pipeline/pipelineConfig';
import { GEOJSON_MERGE_INPUT_HANDLES, GEOJSON_SET_INPUT_HANDLES, GEOJSON_SWITCH_INPUT_HANDLES, GEOJSON_WITHIN_AREA_INPUT_HANDLES, GEOJSON_ZIP_INPUT_HANDLES } from '@/types/types';
import { addEdge } from '@xyflow/react';
import { useEffect } from 'react';
import './webMcpTypes';

const NODE_HANDLES: Record<string, { sources: string[]; targets: string[] }> = {
  'geojson-input': {
    sources: ['geojson'],
    targets: [],
  },
  'gps-map': {
    sources: [],
    targets: ['geojson'],
  },
  'geojson-viewer': {
    sources: [],
    targets: ['geojson'],
  },
  'geo-bounds-filter': {
    sources: ['geojson'],
    targets: ['geojson'],
  },
  'geojson-within-area': {
    sources: ['geojson'],
    targets: [...GEOJSON_WITHIN_AREA_INPUT_HANDLES],
  },
  'geojson-merge': {
    sources: ['geojson'],
    targets: [...GEOJSON_MERGE_INPUT_HANDLES],
  },
  'geojson-switch': {
    sources: ['geojson'],
    targets: [...GEOJSON_SWITCH_INPUT_HANDLES],
  },
  'geojson-style': {
    sources: ['geojson'],
    targets: ['geojson'],
  },
  'geojson-zip': {
    sources: ['geojson'],
    targets: [...GEOJSON_ZIP_INPUT_HANDLES],
  },
  'geojson-feature-picker': {
    sources: ['geojson'],
    targets: ['geojson'],
  },
  'geojson-union': {
    sources: ['geojson'],
    targets: [...GEOJSON_SET_INPUT_HANDLES],
  },
  'geojson-intersection': {
    sources: ['geojson'],
    targets: [...GEOJSON_SET_INPUT_HANDLES],
  },
  'geojson-difference': {
    sources: ['geojson'],
    targets: [...GEOJSON_SET_INPUT_HANDLES],
  },
  'geojson-symmetric-difference': {
    sources: ['geojson'],
    targets: [...GEOJSON_SET_INPUT_HANDLES],
  },
  'geojson-jsonata': {
    sources: ['geojson'],
    targets: ['geojson'],
  },
  'post-it': {
    sources: [],
    targets: [],
  },
};

function getNodeHandles(node: { type?: string }, direction: 'sources' | 'targets') {
  return NODE_HANDLES[node.type ?? '']?.[direction] ?? ['geojson'];
}

export default function WebMCPConnectPipelineNodes() {
  const { currentPipeline, setCurrentPipeline } = usePipelineStore();

  useEffect(() => {
    if (!document.modelContext) {
      return;
    }

    const controller = new AbortController();

    document.modelContext
      .registerTool(
        {
          name: 'connect_pipeline_nodes',
          title: 'Connect Pipeline Nodes',
          description:
            'Connect two nodes in the current pipeline with an edge. Specify handles when a node has multiple inputs or outputs.',
          inputSchema: {
            type: 'object',
            properties: {
              sourceNodeId: {
                type: 'string',
                description: 'The id of the node where the edge starts.',
              },
              targetNodeId: {
                type: 'string',
                description: 'The id of the node where the edge ends.',
              },
              sourceHandle: {
                type: 'string',
                description:
                  'Optional id of the source handle. Defaults to geojson when the source node has one output.',
              },
              targetHandle: {
                type: 'string',
                description:
                  'Optional id of the target handle. Defaults to geojson when the target node has one input.',
              },
            },
            required: ['sourceNodeId', 'targetNodeId'],
            additionalProperties: false,
          },
          annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: true,
            openWorldHint: false,
          },
          async execute({ sourceNodeId, targetNodeId, sourceHandle, targetHandle }) {
            if (typeof sourceNodeId !== 'string' || !sourceNodeId) {
              return 'A valid sourceNodeId is required.';
            }

            if (typeof targetNodeId !== 'string' || !targetNodeId) {
              return 'A valid targetNodeId is required.';
            }

            if (sourceHandle !== undefined && (typeof sourceHandle !== 'string' || !sourceHandle)) {
              return 'sourceHandle must be a non-empty string when provided.';
            }

            if (targetHandle !== undefined && (typeof targetHandle !== 'string' || !targetHandle)) {
              return 'targetHandle must be a non-empty string when provided.';
            }

            if (sourceNodeId === targetNodeId) {
              return 'Source and target node ids must be different.';
            }

            const nodeIds = new Set(currentPipeline.nodes.map((node) => node.id));
            if (!nodeIds.has(sourceNodeId)) {
              return `Source pipeline node not found: ${sourceNodeId}`;
            }

            if (!nodeIds.has(targetNodeId)) {
              return `Target pipeline node not found: ${targetNodeId}`;
            }

            const sourceNode = currentPipeline.nodes.find((node) => node.id === sourceNodeId);
            const targetNode = currentPipeline.nodes.find((node) => node.id === targetNodeId);
            const sourceHandles = getNodeHandles(sourceNode!, 'sources');
            const targetHandles = getNodeHandles(targetNode!, 'targets');
            const resolvedSourceHandle = sourceHandle ?? (
              sourceHandles.length === 1 ? sourceHandles[0] : undefined
            );
            const resolvedTargetHandle = targetHandle ?? (
              targetHandles.length === 1 ? targetHandles[0] : undefined
            );

            if (!resolvedSourceHandle) {
              return `sourceHandle is required for ${sourceNode?.type ?? 'this'} nodes. Valid handles: ${sourceHandles.join(', ')}`;
            }

            if (!resolvedTargetHandle) {
              return `targetHandle is required for ${targetNode?.type ?? 'this'} nodes. Valid handles: ${targetHandles.join(', ')}`;
            }

            if (!sourceHandles.includes(resolvedSourceHandle)) {
              return `Invalid sourceHandle for ${sourceNodeId}. Valid handles: ${sourceHandles.join(', ')}`;
            }

            if (!targetHandles.includes(resolvedTargetHandle)) {
              return `Invalid targetHandle for ${targetNodeId}. Valid handles: ${targetHandles.join(', ')}`;
            }

            const edges = addEdge(
              {
                source: sourceNodeId,
                target: targetNodeId,
                sourceHandle: resolvedSourceHandle,
                targetHandle: resolvedTargetHandle,
                type: EDGE_TYPE,
              },
              currentPipeline.edges,
            );

            if (edges.length === currentPipeline.edges.length) {
              return `Pipeline edge already exists from ${sourceNodeId} to ${targetNodeId}`;
            }

            const nodes = [...currentPipeline.nodes];
            setCurrentPipeline({ ...currentPipeline, nodes, edges, isDirty: true });
            window.dispatchEvent(new CustomEvent('pipeline:graph-updated', {
              detail: { nodes, edges },
            }));

            return `Connected pipeline nodes ${sourceNodeId} -> ${targetNodeId}`;
          },
        },
        { signal: controller.signal },
      )
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.error('[WebMCP] Failed to register connect_pipeline_nodes:', error);
        }
      });

    return () => controller.abort();
  }, [currentPipeline, setCurrentPipeline]);

  return null;
}
