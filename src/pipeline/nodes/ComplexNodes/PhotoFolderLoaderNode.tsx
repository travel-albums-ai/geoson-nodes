import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { Box, Button, Typography } from '@mui/material';
import { useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { FolderOpen } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

type Photo = { name: string; size: number; thumb: string };
type PhotoFolderLoaderNodeData = { photos?: Photo[] };

const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i;
const THUMB_SIZE_PX = 64;
// Thumbnails are saved with the pipeline, which lives in localStorage.
const MAX_PHOTOS = 300;

const isPhoto = (file: File) => file.type.startsWith('image/') || IMAGE_EXTENSIONS.test(file.name);

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

async function makeThumbnail(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = THUMB_SIZE_PX / Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = THUMB_SIZE_PX;
    canvas.height = THUMB_SIZE_PX;
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    canvas.getContext('2d')?.drawImage(bitmap, (THUMB_SIZE_PX - width) / 2, (THUMB_SIZE_PX - height) / 2, width, height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.6);
  } catch {
    return '';
  }
}

function PhotoFolderLoaderNode({ id, data }: NodeProps<Node<PhotoFolderLoaderNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const photos = data.photos;

  const onFolderChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
      .filter(isPhoto)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .slice(0, MAX_PHOTOS);
    event.target.value = '';

    setLoading(true);
    const next: Photo[] = [];
    for (const file of files) {
      next.push({ name: file.webkitRelativePath || file.name, size: file.size, thumb: await makeThumbnail(file) });
    }
    setLoading(false);

    setNodes((current) => current.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, photos: next } } : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  return (
    <NodeWrapper type="photo-folder-loader" defaultSize={{ width: 360, height: 360 }}>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(event) => void onFolderChosen(event)}
        {...{ webkitdirectory: '' }}
      />
      <Box className="nodrag nopan" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button disabled={loading} variant="contained" startIcon={<FolderOpen size={16} />} onClick={() => inputRef.current?.click()}>
          {t('pipelinePhotoFolderLoaderChoose')}
        </Button>
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
      {photos && photos.length > 0 && (
        <Box
          component="ul"
          className="nodrag nopan nowheel"
          sx={{ flex: 1, minHeight: 0, overflowY: 'auto', m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
          {photos.map((photo, index) => (
            <Box component="li" key={`${index}-${photo.name}`} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                component={photo.thumb ? 'img' : 'div'}
                src={photo.thumb || undefined}
                alt={photo.name}
                sx={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 0.5, flexShrink: 0, bgcolor: 'action.hover' }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap title={photo.name}>{photo.name}</Typography>
                <Typography variant="caption" color="text.secondary">{formatSize(photo.size)}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </NodeWrapper>
  );
}

export default PhotoFolderLoaderNode;
