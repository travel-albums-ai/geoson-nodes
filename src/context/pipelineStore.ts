import { createLocalStorageStoreNg } from '@/lib/createLocalStorageStoreNg';
import { WORKER_NODE_TYPES } from '@/types/types';
import type { Edge, Node } from '@xyflow/react';

export type PipelineGraph = {
  nodes: Node[]
  edges: Edge[]
}

export type PipelineType = 'user' | 'community'


export type SavedPipeline = PipelineGraph & {
  id: string
  name: string
  isDeletable: boolean
  dateUpdated: string
  dateCreated: string
  type: PipelineType
}

export type CurrentPipeline = PipelineGraph & {
  id: string
  name: string
  isDirty: boolean
}

type PipelineStore = {
  pipelines: SavedPipeline[],
  currentPipeline: CurrentPipeline,
  lockReactflow: boolean,
  showToolbox: boolean,
  toolboxAsGrid: boolean,
  searchTermToolbox: string,
  collapsedToolboxGroups: Record<string, boolean>
}

const defaults: PipelineStore = {
  pipelines: [],
  currentPipeline: {
    id: '',
    name: '',
    nodes: [],
    edges: [],
    isDirty: false,
  },
  lockReactflow: false,
  showToolbox: true,
  toolboxAsGrid: false,
  searchTermToolbox: '',
  collapsedToolboxGroups: {}
}

const {
  Provider: PipelineProvider,
  useStore,
  useSetStore,
  useStoreSelector: usePipelineStoreSelector
} = createLocalStorageStoreNg<PipelineStore>(defaults, 'pipelineStore')

function createPipelineId() {
  return `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// Drops nodes the pipeline engine no longer supports (e.g. from pipelines
// saved before the photo nodes were removed), along with their edges.
function keepSupportedGraph<T extends PipelineGraph>(graph: T): T {
  const nodes = graph.nodes.filter((node) => WORKER_NODE_TYPES.has(node.type ?? ''))
  const nodeIds = new Set(nodes.map((node) => node.id))

  return {
    ...graph,
    nodes,
    edges: graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
  }
}

function createPipelineDate() {
  return new Date().toISOString()
}

export function prepareGraph({ nodes, edges }: PipelineGraph): PipelineGraph {
  return {
    nodes: nodes.map((node) => {
      const {
        geojsonFile: _geojsonFile,
        geojson: _geojson,
        ...data
      } = node.data as Record<string, unknown>

      return { ...node, data }
    }),
    edges: edges.map((edge) => ({ ...edge }))
  }
}

export const usePipelineStore = () => {
  const store = useStore()
  const setState = useSetStore()

  return {
    setState,
    toolboxAsGrid: store.toolboxAsGrid,
    pipelines: store.pipelines,
    currentPipeline: store.currentPipeline,
    setCurrentPipeline: (currentPipeline: CurrentPipeline | ((prev: CurrentPipeline) => CurrentPipeline)) =>
      setState((prev) => ({
        ...prev,
        currentPipeline: typeof currentPipeline === 'function'
          ? currentPipeline(prev.currentPipeline)
          : currentPipeline,
      })),
    updateCurrentPipeline: (graph: PipelineGraph, isDirty = true) =>
      setState((prev) => ({
        ...prev,
        currentPipeline: { ...prev.currentPipeline, ...graph, isDirty },
      })),
    toggleLockReactflow: () => setState((prev) => ({ ...prev, lockReactflow: !prev.lockReactflow })),
    enableReactflow: () => setState((prev) => ({ ...prev, lockReactflow: false })),
    disableReactflow: () => setState((prev) => ({ ...prev, lockReactflow: true })),
    setCurrentPipelineName: (name: string) =>
      setState((prev) => ({
        ...prev,
        currentPipeline: { ...prev.currentPipeline, name },
      })),
    setCurrentPipelineDirty: (isDirty: boolean) =>
      setState((prev) => ({
        ...prev,
        currentPipeline: { ...prev.currentPipeline, isDirty },
      })),
    toggleToolbox: () => setState((prev) => ({ ...prev, showToolbox: !prev.showToolbox })),
    saveNew: (name: string, graph: PipelineGraph) => {
      const date = createPipelineDate()
      const pipeline: SavedPipeline = {
        ...prepareGraph(graph),
        id: createPipelineId(),
        name: name.trim() || 'Untitled pipeline',
        isDeletable: true,
        dateUpdated: date,
        dateCreated: date,
        type: 'user',
      }

      setState((prev) => ({
        ...prev,
        pipelines: [...prev.pipelines, pipeline]
      }))

      return pipeline.id
    },
    cloneExisting: (id: string, name?: string) => {
      const existing = store.pipelines.find((pipeline) => pipeline.id === id)
      if (!existing) return undefined

      const date = createPipelineDate()
      const clone: SavedPipeline = {
        ...prepareGraph(existing),
        id: createPipelineId(),
        name: name?.trim() || `${existing.name} copy`,
        isDeletable: true,
        dateUpdated: date,
        dateCreated: date,
        type: 'user',
      }

      setState((prev) => ({
        ...prev,
        pipelines: [...prev.pipelines, clone]
      }))

      return clone.id
    },
    updateById: (id: string, name: string, graph: PipelineGraph) => {
      const pipeline: SavedPipeline = {
        ...prepareGraph(graph),
        id,
        name: name.trim() || 'Untitled pipeline',
        isDeletable: store.pipelines.find((item) => item.id === id)?.isDeletable ?? true,
        dateUpdated: createPipelineDate(),
        dateCreated: store.pipelines.find((item) => item.id === id)?.dateCreated ?? createPipelineDate(),
        type: store.pipelines.find((item) => item.id === id)?.type ?? 'user',
      }

      setState((prev) => {
        if (!prev.pipelines.some((item) => item.id === id)) return prev

        return {
          ...prev,
          pipelines: prev.pipelines.map((item) => item.id === id ? pipeline : item)
        }
      })

      return pipeline.id
    },
    deleteById: (id: string) => {
      setState((prev) => {
        const pipelines = prev.pipelines.filter((pipeline) => pipeline.id !== id)
        return pipelines.length === prev.pipelines.length ? prev : { ...prev, pipelines }
      })
    },
    loadById: (id: string) => {
      const pipeline = store.pipelines.find((item) => item.id === id)
      return pipeline && { ...pipeline, ...keepSupportedGraph(pipeline) }
    }
  }
}

export { PipelineProvider, usePipelineStoreSelector };
