import NodeWrapper from '@/pipeline/components/NodeWrapper';
import { Alert, Box, Button, IconButton, Link, TextField, Tooltip, Typography } from '@mui/material';
import { useReactFlow, type Node, type NodeProps } from '@xyflow/react';
import { RotateCw } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

type IframeNodeData = { address?: string };

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

// Browsers do not tell the page when X-Frame-Options, frame-ancestors or a
// sandbox blocks a frame, so a load that has not finished by then is reported as possibly blocked.
const IFRAME_LOAD_TIMEOUT_MS = 10000;

// Addresses without a scheme are opened as https. Only http and https are
// accepted, so a javascript: address cannot run in the app's own origin.
function normalizeIframeAddress(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withScheme);
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function IframeNode({ id, data }: NodeProps<Node<IframeNodeData>>) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const storedAddress = typeof data.address === 'string' ? data.address : '';
  const [draft, setDraft] = useState(storedAddress);
  const [syncedAddress, setSyncedAddress] = useState(storedAddress);
  const [invalid, setInvalid] = useState(false);
  // Changing the key remounts the iframe, which reloads the page even when the address is unchanged.
  const [reloadKey, setReloadKey] = useState(0);
  const shownAddress = storedAddress ? normalizeIframeAddress(storedAddress) : null;
  // Identifies one load attempt, so a result from an earlier load or address is ignored.
  const loadToken = shownAddress ? `${reloadKey}|${shownAddress}` : null;
  const [loadedToken, setLoadedToken] = useState<string | null>(null);
  const [timedOutToken, setTimedOutToken] = useState<string | null>(null);
  // An http page inside this https app is blocked by the browser as mixed content.
  const mixedContentBlocked = shownAddress !== null
    && window.location.protocol === 'https:'
    && shownAddress.startsWith('http:');
  const loadTimedOut = loadToken !== null && timedOutToken === loadToken && loadedToken !== loadToken;

  if (storedAddress !== syncedAddress) {
    setSyncedAddress(storedAddress);
    setDraft(storedAddress);
  }

  useEffect(() => {
    if (!loadToken || mixedContentBlocked) return;
    const timer = window.setTimeout(() => setTimedOutToken(loadToken), IFRAME_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [loadToken, mixedContentBlocked]);

  const go = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const address = normalizeIframeAddress(draft);
    if (!address) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    setDraft(address);
    setReloadKey((key) => key + 1);
    setNodes((current) => current.map((node) =>
      node.id === id ? { ...node, data: { ...node.data, address } } : node
    ));
    window.dispatchEvent(new CustomEvent('pipeline:changed'));
  };

  return (
    <NodeWrapper type="iframe" defaultSize={{ width: 480, height: 360 }}>
      <Box
        component="form"
        className="nodrag nopan"
        onSubmit={go}
        sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}
      >
        <TextField
          size="small"
          fullWidth
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          placeholder={t('pipelineIframeAddressPlaceholder')}
          slotProps={{ htmlInput: { 'aria-label': t('pipelineIframeAddress'), spellCheck: false, autoComplete: 'off' } }}
          error={invalid}
          helperText={invalid ? t('pipelineIframeInvalidAddress') : undefined}
        />
        <Button type="submit" variant="contained" sx={{ height: 40, minWidth: 64 }}>
          {t('pipelineIframeGo')}
        </Button>
        <Tooltip title={t('pipelineIframeReload')}>
          <span>
            <IconButton
              aria-label={t('pipelineIframeReload')}
              disabled={!shownAddress}
              onClick={() => setReloadKey((key) => key + 1)}
              sx={{ height: 40, width: 40 }}
            >
              <RotateCw size={18} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {shownAddress ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 1 }}>
          {mixedContentBlocked ? (
            <Alert severity="warning">{t('pipelineIframeMixedContent')}</Alert>
          ) : (
            <Box
              key={reloadKey}
              component="iframe"
              className="nodrag nopan"
              src={shownAddress}
              title={t('pipelineIframe')}
              onLoad={() => setLoadedToken(loadToken)}
              sx={{ flex: 1, minHeight: 160, width: '100%', border: 0, borderRadius: 1, bgcolor: 'background.default' }}
            />
          )}
          {loadTimedOut && (
            <Alert severity="warning">{t('pipelineIframeLoadTimeout')}</Alert>
          )}
          <Link
            className="nodrag nopan"
            href={shownAddress}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('pipelineIframeOpenNewTab')}
          </Link>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('pipelineIframeEmpty')}
        </Typography>
      )}
    </NodeWrapper>
  );
}

export default IframeNode;
