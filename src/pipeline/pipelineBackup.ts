import type { SavedPipeline } from '@/context/pipelineStore';
import { isPipelineGraph } from '@/pipeline/pipelineApi';

const BACKUP_APP_ID = 'CouchMapper';
const BACKUP_VERSION = 1;

type PipelineBackup = {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  pipelines: SavedPipeline[];
};

export function createPipelineBackup(pipelines: SavedPipeline[]): string {
  const backup: PipelineBackup = {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    pipelines,
  };

  return JSON.stringify(backup, null, 2);
}

export function parsePipelineBackup(text: string): SavedPipeline[] {
  let backup: unknown;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error('Backup file is not valid JSON');
  }

  const candidate = backup as Partial<PipelineBackup> | null;
  if (!candidate || typeof candidate !== 'object' || candidate.app !== BACKUP_APP_ID) {
    throw new Error('Backup file is not a CouchMapper backup');
  }
  if (candidate.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${String(candidate.version)}`);
  }
  if (!Array.isArray(candidate.pipelines)) {
    throw new Error('Backup file has no pipelines');
  }

  return candidate.pipelines.map((pipeline) => {
    const saved = pipeline as Partial<SavedPipeline> | null;
    if (
      !saved ||
      typeof saved.id !== 'string' ||
      typeof saved.name !== 'string' ||
      !isPipelineGraph(saved)
    ) {
      throw new Error('Backup file contains an invalid pipeline');
    }

    const now = new Date().toISOString();
    return {
      ...saved,
      id: saved.id,
      name: saved.name,
      nodes: saved.nodes,
      edges: saved.edges,
      isDeletable: saved.isDeletable ?? true,
      type: saved.type ?? 'user',
      dateCreated: saved.dateCreated ?? now,
      dateUpdated: saved.dateUpdated ?? now,
    } as SavedPipeline;
  });
}
