import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { Box, Button, Typography } from '@mui/material';
import { useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { FolderOpen, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Photo = { name: string; size: number; modified: number; url: string };
type PhotoFolderLoaderNodeData = Record<string, unknown>;
type PhotoSource = { name: string; size: number; modified: number; file: File };

// The File System Access API is not in the TypeScript DOM lib.
type DirHandle = {
  kind: 'directory';
  name: string;
  values: () => AsyncIterable<{ kind: string; name: string; getFile?: () => Promise<File>; values?: DirHandle['values'] }>;
  queryPermission: (options: { mode: 'read' }) => Promise<PermissionState>;
  requestPermission: (options: { mode: 'read' }) => Promise<PermissionState>;
};
type PickerWindow = Window & { showDirectoryPicker?: (options: { mode: 'read' }) => Promise<DirHandle> };

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i;
const MAX_GRID_COLUMNS = 4;
const MAX_GRID_ROWS = 4;
const GRID_GAP_PX = 4;
const MAX_PHOTOS = 300;
const REFRESH_INTERVAL_MS = 5000;
const DB_NAME = 'photo-folder-loader';
const STORE_NAME = 'handles';

const isPhoto = (name: string, type = '') => type.startsWith('image/') || IMAGE_EXTENSIONS.test(name);

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const sameKey = (a: { name: string; size: number; modified: number }, b: { name: string; size: number; modified: number }) =>
  a.name === b.name && a.size === b.size && a.modified === b.modified;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function handleStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = run(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

const loadHandle = (id: string) => handleStore<DirHandle | undefined>('readonly', (store) => store.get(id));
const saveHandle = (id: string, handle: DirHandle) => handleStore('readwrite', (store) => store.put(handle, id));

async function listDirectory(handle: DirHandle, prefix = ''): Promise<PhotoSource[]> {
  const found: PhotoSource[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === 'directory' && entry.values) {
      found.push(...await listDirectory(entry as unknown as DirHandle, `${prefix}${entry.name}/`));
    } else if (entry.kind === 'file' && entry.getFile && isPhoto(entry.name)) {
      const getFile = entry.getFile.bind(entry);
      const file = await getFile();
      found.push({ name: `${prefix}${entry.name}`, size: file.size, modified: file.lastModified, file });
    }
  }
  return found;
}

function PhotoFolderLoaderNode({ id, data }: NodeProps<Node<PhotoFolderLoaderNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<DirHandle | null>(null);
  const photosRef = useRef<Photo[] | null>(null);
  const busyRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [needsAccess, setNeedsAccess] = useState(false);
  const [photos, setPhotos] = useState<Photo[] | null>(null);

  const hasPhotos = !!photos && photos.length > 0;

  useEffect(() => {
    const element = gridRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => setGridWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [hasPhotos]);

  const canWatch = typeof window !== 'undefined' && !!(window as PickerWindow).showDirectoryPicker;

  const commit = useCallback((sources: PhotoSource[]) => {
    const sorted = [...sources]
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .slice(0, MAX_PHOTOS);
    const previous = photosRef.current ?? [];
    const unchanged = photosRef.current !== null
      && previous.length === sorted.length
      && sorted.every((source, index) => sameKey(source, previous[index]));
    if (unchanged) return Promise.resolve();

    const next = sorted.map((source) => {
      const known = previous.find((photo) => sameKey(photo, source));
      return known ?? {
        name: source.name,
        size: source.size,
        modified: source.modified,
        url: URL.createObjectURL(source.file),
      };
    });
    const retainedUrls = new Set(next.map((photo) => photo.url));
    previous.forEach((photo) => {
      if (!retainedUrls.has(photo.url)) URL.revokeObjectURL(photo.url);
    });
    photosRef.current = next;
    setPhotos(next);
  }, []);

  const refresh = useCallback(async (interactive = false) => {
    const handle = handleRef.current;
    if (!handle || busyRef.current) return;

    busyRef.current = true;
    try {
      let permission = await handle.queryPermission({ mode: 'read' });
      if (permission !== 'granted' && interactive) {
        permission = await handle.requestPermission({ mode: 'read' });
      }
      setNeedsAccess(permission !== 'granted');
      if (permission !== 'granted') return;

      setLoading(true);
      await commit(await listDirectory(handle));
    } catch {
      // The folder was moved or deleted; keep the last known list.
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }, [commit]);

  useEffect(() => {
    if ('photos' in data) {
      setNodes((current) => current.map((node) => {
        if (node.id !== id || !('photos' in node.data)) return node;
        const { photos: _legacyPhotos, ...rest } = node.data;
        return { ...node, data: rest };
      }));
      window.dispatchEvent(new CustomEvent('pipeline:changed'));
    }
  }, [data, id, setNodes]);

  useEffect(() => () => {
    photosRef.current?.forEach((photo) => URL.revokeObjectURL(photo.url));
    photosRef.current = null;
  }, []);

  useEffect(() => {
    if (!canWatch) return;

    let cancelled = false;
    void loadHandle(id).then((handle) => {
      if (cancelled || !handle) return;
      handleRef.current = handle;
      void refresh();
    }).catch(() => undefined);

    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, REFRESH_INTERVAL_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [canWatch, id, refresh]);

  const chooseFolder = async () => {
    if (!canWatch) {
      inputRef.current?.click();
      return;
    }

    try {
      const handle = await (window as PickerWindow).showDirectoryPicker!({ mode: 'read' });
      handleRef.current = handle;
      await saveHandle(id, handle).catch(() => undefined);
      setNeedsAccess(false);
      await refresh(true);
    } catch {
      // The picker was dismissed.
    }
  };

  const onFilesChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => isPhoto(file.name, file.type));
    event.target.value = '';

    setLoading(true);
    await commit(files.map((file) => ({
      name: file.webkitRelativePath || file.name,
      size: file.size,
      modified: file.lastModified,
      file,
    })));
    setLoading(false);
  };

  return (
    <NodeWrapper type="photo-folder-loader" defaultSize={{ width: 360, height: 360 }}>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => void onFilesChosen(event)}
        {...{ webkitdirectory: '' }}
      />
      <Box className="nodrag nopan" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button disabled={loading} variant="contained" startIcon={<FolderOpen size={16} />} onClick={() => void chooseFolder()}>
          {t('pipelinePhotoFolderLoaderChoose')}
        </Button>
        {needsAccess && (
          <Button variant="outlined" startIcon={<RefreshCw size={16} />} onClick={() => void refresh(true)}>
            {t('pipelinePhotoFolderLoaderReconnect')}
          </Button>
        )}
        {photos && photos.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('pipelinePhotoFolderLoaderCount', { count: photos.length })}
          </Typography>
        )}
      </Box>

      {!photos && (
        <Typography variant="body2" color="text.secondary">{t('pipelinePhotoFolderLoaderEmpty')}</Typography>
      )}
      {photos?.length === 0 && (
        <Typography variant="body2" color="text.secondary">{t('pipelinePhotoFolderLoaderNoPhotos')}</Typography>
      )}
      {photos && photos.length > 0 && (() => {
        const columns = Math.min(MAX_GRID_COLUMNS, photos.length);
        const cell = Math.max(0, (gridWidth - GRID_GAP_PX * (columns - 1)) / columns);
        const visibleRows = Math.min(MAX_GRID_ROWS, Math.ceil(photos.length / columns));
        const maxHeight = cell * visibleRows + GRID_GAP_PX * (visibleRows - 1);

        return (
          <Box
            ref={gridRef}
            component="ul"
            className="nodrag nopan nowheel"
            sx={{
              flex: 1,
              minHeight: 0,
              maxHeight: gridWidth ? maxHeight : undefined,
              overflowY: 'auto',
              m: 0,
              p: 0,
              listStyle: 'none',
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gridAutoRows: cell || undefined,
              gap: `${GRID_GAP_PX}px`,
            }}
          >
            {photos.map((photo, index) => (
              <Box
                component="li"
                key={`${index}-${photo.name}`}
                title={`${photo.name} · ${formatSize(photo.size)}`}
                sx={{ overflow: 'hidden', borderRadius: 0.5, bgcolor: 'action.hover' }}
              >
                <Box
                  component="img"
                  src={photo.url}
                  alt={photo.name}
                  loading="lazy"
                  sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
            ))}
          </Box>
        );
      })()}
    </NodeWrapper>
  );
}

export default PhotoFolderLoaderNode;
