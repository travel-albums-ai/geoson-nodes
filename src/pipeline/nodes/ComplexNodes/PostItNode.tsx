import { useNodeResize } from '@/hooks/useNodeResize';
import { NODE_MIN_HEIGHT, NODE_MIN_WIDTH, readNodeSize, type NodeSize } from '@/pipeline/nodeSizes';
import { Box, IconButton, Tooltip } from '@mui/material';
import { NodeResizer, NodeToolbar, Position, useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { Copy, Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type PostItNodeData = {
  text?: string;
  size?: NodeSize;
};

const NOTE_SIZE_PX = 220;
const NOTE_PADDING_PX = 16;
const MAX_FONT_SIZE_PX = 28;
const MIN_FONT_SIZE_PX = 8;
const TEXT_DEBOUNCE_MS = 300;
const NOTE_COLOR = '#fff59d';
const NOTE_TEXT_COLOR = '#3b3000';

// Binary search for the largest font size at which the wrapped text still
// fits the textarea. The textarea has a fixed height, so scrollHeight only
// exceeds clientHeight when the text overflows.
function fitFontSize(textarea: HTMLTextAreaElement) {
  let low = MIN_FONT_SIZE_PX;
  let high = MAX_FONT_SIZE_PX;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    textarea.style.fontSize = `${mid}px`;

    if (textarea.scrollHeight <= textarea.clientHeight) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  textarea.style.fontSize = `${low}px`;
}

function PostItNode({ id, data, selected }: NodeProps<Node<PostItNodeData>>) {
  const { t } = useTranslation();
  const { addNodes, deleteElements, getNode, getNodes, setNodes } = useReactFlow();
  const storedText = data.text ?? '';
  const [draft, setDraft] = useState(storedText);
  // The last text known to match node data. Lets external changes be
  // distinguished from the node's own debounced commits.
  const syncedTextRef = useRef(storedText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { size, onResize, onResizeEnd } = useNodeResize(id, readNodeSize(data.size));
  const width = size?.width ?? NOTE_SIZE_PX;
  const height = size?.height ?? NOTE_SIZE_PX;

  useEffect(() => {
    if (storedText === syncedTextRef.current) return;

    syncedTextRef.current = storedText;
    setDraft(storedText);
  }, [storedText]);

  // Runs before paint so the font size never flashes at the previous value.
  useLayoutEffect(() => {
    if (textareaRef.current) {
      fitFontSize(textareaRef.current);
    }
  }, [draft, width, height]);

  useEffect(() => {
    if (draft === syncedTextRef.current) return;

    const timer = window.setTimeout(() => {
      syncedTextRef.current = draft;
      setNodes((current) => current.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, text: draft } }
          : node
      ));
      window.dispatchEvent(new CustomEvent('pipeline:changed'));
    }, TEXT_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draft, id, setNodes]);

  const deleteNode = () => {
    void deleteElements({ nodes: [{ id }] });
  };

  const cloneNode = () => {
    const node = getNode(id);
    if (!node) return;

    const existingIds = new Set(getNodes().map((existingNode) => existingNode.id));
    const baseId = `${id}-copy`;
    let cloneId = baseId;
    let suffix = 2;

    while (existingIds.has(cloneId)) {
      cloneId = `${baseId}-${suffix++}`;
    }

    addNodes({
      ...node,
      id: cloneId,
      position: {
        x: node.position.x + NOTE_SIZE_PX + 40,
        y: node.position.y + 40,
      },
      data: { ...node.data },
      selected: true,
    });
  };

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={NODE_MIN_WIDTH}
        minHeight={NODE_MIN_HEIGHT}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
      />
      <NodeToolbar position={Position.Top} offset={8}>
        <Box
          className="nodrag nopan"
          sx={{
            display: 'flex',
            gap: 0.5,
            p: 0.25,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper',
            boxShadow: 2,
          }}
        >
          <Tooltip title={t('nodeClone')}>
            <IconButton size="small" aria-label={t('nodeClone')} onClick={cloneNode}>
              <Copy size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('nodeDelete')}>
            <IconButton size="small" aria-label={t('nodeDelete')} onClick={deleteNode}>
              <Trash2 size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </NodeToolbar>

      <Box
        sx={{
          cursor: 'grab',
          boxSizing: 'border-box',
          width,
          height,
          minWidth: NODE_MIN_WIDTH,
          minHeight: NODE_MIN_HEIGHT,
          p: `${NOTE_PADDING_PX}px`,
          bgcolor: NOTE_COLOR,
          color: NOTE_TEXT_COLOR,
          borderRadius: 1,
          boxShadow: '0 4px 10px -2px rgba(0, 0, 0, 0.35)',
          transition: 'box-shadow 0.25s ease',
          '&:hover': {
            boxShadow: '0 6px 14px -2px rgba(0, 0, 0, 0.45)',
          },
        }}
      >
        <Box
          component="textarea"
          ref={textareaRef}
          className="nodrag"
          value={draft}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(event.target.value)}
          placeholder={t('pipelinePostItPlaceholder')}
          aria-label={t('pipelinePostIt')}
          sx={{
            display: 'block',
            boxSizing: 'border-box',
            width: '100%',
            height: '100%',
            m: 0,
            p: 0,
            border: 0,
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            bgcolor: 'transparent',
            color: 'inherit',
            fontFamily: 'inherit',
            lineHeight: 1.25,
            overflowWrap: 'anywhere',
            cursor: 'text',
            '&::placeholder': {
              color: 'inherit',
              opacity: 0.5,
            },
          }}
        />
      </Box>
    </>
  );
}

export default PostItNode;
