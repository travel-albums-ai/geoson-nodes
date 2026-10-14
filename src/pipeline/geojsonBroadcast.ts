import { hashString } from '@/lib/contentHash';
import type { GeoJsonFeatureCollectionArray } from '@/types/types';

export const GEOJSON_BROADCAST_MESSAGE_TYPE = 'geojson-broadcast';

type BroadcastEnvelope = {
  type: typeof GEOJSON_BROADCAST_MESSAGE_TYPE;
  hash: string;
  geojson: GeoJsonFeatureCollectionArray;
};

type ReceivedBroadcast = {
  digest: string;
  geojson: GeoJsonFeatureCollectionArray;
};

// Latest payload per broadcast hash, read by receiver nodes when the pipeline evaluates.
const receivedBroadcasts = new Map<string, ReceivedBroadcast>();

let listening = false;

const BROADCAST_CHANNEL_NAME = 'geojson-broadcast';

let broadcastChannel: BroadcastChannel | undefined;

const BROADCAST_HELLO_TYPE = 'geojson-broadcast-hello';

// Latest envelope per hash, sent again to tabs that start listening after the change was posted.
const latestEnvelopes = new Map<string, BroadcastEnvelope>();

// Every window postMessage can reach from here: the frame tree of the top window, the parent, the opener and this window.
function reachableWindows(): Window[] {
  const reached = new Set<Window>();

  const visit = (target: Window) => {
    if (reached.has(target)) return;
    reached.add(target);

    for (let index = 0; index < target.frames.length; index++) {
      visit(target.frames[index]);
    }
  };

  visit(window.top ?? window);
  if (window.parent) visit(window.parent);
  if (window.opener) visit(window.opener);
  visit(window);

  return [...reached];
}

// Sends to every reachable window with a wildcard target origin, and to other tabs of this origin over BroadcastChannel.
export function postGeoJsonBroadcast(hash: string, geojson: GeoJsonFeatureCollectionArray) {
  const envelope: BroadcastEnvelope = { type: GEOJSON_BROADCAST_MESSAGE_TYPE, hash, geojson };
  latestEnvelopes.set(hash, envelope);

  for (const target of reachableWindows()) {
    target.postMessage(envelope, '*');
  }

  broadcastChannel?.postMessage(envelope);
}

function acceptBroadcast(data: unknown) {
  const envelope = data as Partial<BroadcastEnvelope> | null;

  if (!envelope || envelope.type !== GEOJSON_BROADCAST_MESSAGE_TYPE) return;
  if (typeof envelope.hash !== 'string' || !Array.isArray(envelope.geojson)) return;

  const digest = hashString(JSON.stringify(envelope.geojson));

  // A broadcast of unchanged content does not re-run the pipeline.
  if (receivedBroadcasts.get(envelope.hash)?.digest === digest) return;

  receivedBroadcasts.set(envelope.hash, { digest, geojson: envelope.geojson });
  window.dispatchEvent(new CustomEvent('pipeline:changed'));
}

export function ensureBroadcastListener() {
  if (listening) return;
  listening = true;

  // Messages from any origin are accepted; the shape check and the hash match are the only gates.
  window.addEventListener('message', (event: MessageEvent) => acceptBroadcast(event.data));

  const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  broadcastChannel = channel;
  channel.onmessage = (event: MessageEvent) => {
    if (event.data?.type === BROADCAST_HELLO_TYPE) {
      for (const envelope of latestEnvelopes.values()) channel.postMessage(envelope);
      return;
    }
    acceptBroadcast(event.data);
  };

  // Asks tabs that already sent a value to send it again, so a tab opened later is not left empty.
  channel.postMessage({ type: BROADCAST_HELLO_TYPE });
}

export function getReceivedBroadcast(hash: string): ReceivedBroadcast | undefined {
  return receivedBroadcasts.get(hash);
}
