import { InputHandle } from '@/pipeline/components/InputHandle';
import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { OutputHandle } from '@/pipeline/components/OutputHandle';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Copy, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type GeoJsonBroadcastNodeData = { hash?: string };

// 16 hex characters from the Web Crypto API.
function createBroadcastHash(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function GeoJsonBroadcastNode({ id, data }: NodeProps<Node<GeoJsonBroadcastNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const hash = typeof data.hash === 'string' ? data.hash : '';

  const storeHash = (nextHash: string) => {
    setNodes((current) => current.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, hash: nextHash } } : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  useEffect(() => {
    if (hash) return;
    setNodes((current) => current.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, hash: createBroadcastHash() } } : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  }, [id, hash, setNodes]);

  return (
    <>
      <InputHandle id="geojson" position={Position.Top} />
      <NodeWrapper type="geojson-broadcast" defaultSize={{ width: 340 }} hint={t('pipelineGeoJsonBroadcastHint')}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            component="code"
            variant="body2"
            sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}
          >
            {hash}
          </Typography>
          <Tooltip title={t('pipelineGeoJsonBroadcastCopy')}>
            <span>
              <IconButton
                className="nodrag nopan"
                aria-label={t('pipelineGeoJsonBroadcastCopy')}
                disabled={!hash}
                onClick={() => void navigator.clipboard?.writeText(hash)}
              >
                <Copy size={16} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('pipelineGeoJsonBroadcastRegenerate')}>
            <IconButton
              className="nodrag nopan"
              aria-label={t('pipelineGeoJsonBroadcastRegenerate')}
              onClick={() => storeHash(createBroadcastHash())}
            >
              <RefreshCw size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </NodeWrapper>
      <OutputHandle id="geojson" position={Position.Bottom} />
    </>
  );
}

export default GeoJsonBroadcastNode;
