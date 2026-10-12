import type { SavedPipeline } from '@/context/pipelineStore';
import { getPipelineName, isPipelineGraph } from '@/pipeline/pipelineApi';

const starterFiles = import.meta.glob<string>('../samples/*.cep', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const STARTER_PIPELINE_ID_PREFIX = 'starter-';

let starterTemplates: SavedPipeline[] | null = null;

function toStarterId(fileName: string) {
  const slug = fileName
    .replace(/\.cep$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${STARTER_PIPELINE_ID_PREFIX}${slug}`;
}

function parseStarterTemplate(path: string, source: string): SavedPipeline | null {
  const fileName = path.split('/').pop() ?? path;

  try {
    const imported: unknown = JSON.parse(source);

    if (!isPipelineGraph(imported)) {
      console.warn(`${fileName} is not a valid pipeline`);
      return null;
    }

    return {
      id: toStarterId(fileName),
      name: getPipelineName(typeof imported.name === 'string' ? imported.name : undefined, fileName),
      nodes: imported.nodes,
      edges: imported.edges,
      isDeletable: false,
      dateCreated: '',
      dateUpdated: '',
      type: 'starter',
    };
  } catch (error) {
    console.warn(`${fileName} could not be parsed as a pipeline`, error);
    return null;
  }
}

export function getStarterTemplates(): SavedPipeline[] {
  starterTemplates ??= Object.entries(starterFiles)
    .flatMap(([path, source]) => {
      const template = parseStarterTemplate(path, source);
      return template ? [template] : [];
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return starterTemplates;
}

export function findStarterTemplate(id: string): SavedPipeline | undefined {
  return getStarterTemplates().find((template) => template.id === id);
}

export function isStarterPipelineId(id: string): boolean {
  return findStarterTemplate(id) !== undefined;
}
