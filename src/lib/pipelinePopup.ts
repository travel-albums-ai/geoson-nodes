import { setSettingsStore } from '@/context/settingsStore';

type PopupGeometry = { left: number; top: number; width: number; height: number };
type Monitor = { left: number; top: number; width: number; height: number };
// Window Management API (Chromium, permission-gated); not part of the TypeScript DOM lib yet.
type WindowWithScreenDetails = Window & {
  getScreenDetails?: () => Promise<{ screens: { availLeft: number; availTop: number; availWidth: number; availHeight: number }[] }>;
};

export const POPUP_PIPELINE_PARAM = 'popupPipeline';
const POPUP_WINDOW_NAME_PREFIX = 'pipelinePopup:';
const GEOMETRY_STORAGE_KEY = 'pipelinePopupGeometry';
const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;
const MIN_WIDTH = 640;
const MIN_HEIGHT = 480;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function readGeometry(): PopupGeometry | null {
  try {
    const raw = localStorage.getItem(GEOMETRY_STORAGE_KEY);
    if (!raw) return null;
    const geometry = JSON.parse(raw) as Partial<PopupGeometry>;
    const isValid = [geometry.left, geometry.top, geometry.width, geometry.height].every(Number.isFinite);
    return isValid ? geometry as PopupGeometry : null;
  } catch {
    return null;
  }
}

function writeGeometry(geometry: PopupGeometry) {
  try {
    localStorage.setItem(GEOMETRY_STORAGE_KEY, JSON.stringify(geometry));
  } catch {
    // Storage can be unavailable (private mode, quota); the popup still works without restore.
  }
}

// window.screen only describes the monitor the opener is on, so saved positions on other monitors would be dropped.
// Returns null when unavailable or denied; callers then fall back to the opener's monitor.
async function getConnectedMonitors(): Promise<Monitor[] | null> {
  const getScreenDetails = (window as WindowWithScreenDetails).getScreenDetails;
  if (!getScreenDetails) return null;
  try {
    const { screens } = await getScreenDetails.call(window);
    return screens.map(({ availLeft, availTop, availWidth, availHeight }) => ({
      left: availLeft, top: availTop, width: availWidth, height: availHeight,
    }));
  } catch {
    return null;
  }
}

function currentMonitor(): Monitor {
  const { availWidth, availHeight } = window.screen;
  const { availLeft = 0, availTop = 0 } = window.screen as { availLeft?: number; availTop?: number };
  return { left: availLeft, top: availTop, width: availWidth, height: availHeight };
}

// Uses the window centre so a window straddling two monitors is restored to the one it mostly sits on.
function findMonitor(monitors: Monitor[], { left, top, width, height }: PopupGeometry) {
  const x = left + width / 2;
  const y = top + height / 2;
  return monitors.find(m => x >= m.left && x < m.left + m.width && y >= m.top && y < m.top + m.height);
}

// Runs inside the popup itself: a navigation would detach any listener the opener attached to it.
export function initPipelinePopupWindow() {
  if (!window.name.startsWith(POPUP_WINDOW_NAME_PREFIX)) return;

  setSettingsStore({ templatesOpen: false });
  window.addEventListener('pagehide', () => {
    writeGeometry({ left: window.screenX, top: window.screenY, width: window.outerWidth, height: window.outerHeight });
  });
}

export async function openPipelinePopup(pipelineId: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(POPUP_PIPELINE_PARAM, pipelineId);

  const saved = readGeometry();
  const monitors = (await getConnectedMonitors()) ?? [currentMonitor()];
  const savedMonitor = saved && findMonitor(monitors, saved);
  const bounds = savedMonitor ?? currentMonitor();
  const width = clamp(saved?.width ?? DEFAULT_WIDTH, MIN_WIDTH, bounds.width);
  const height = clamp(saved?.height ?? DEFAULT_HEIGHT, MIN_HEIGHT, bounds.height);
  const features = ['popup=yes', `width=${width}`, `height=${height}`];
  if (saved && savedMonitor) {
    const left = clamp(saved.left, bounds.left, bounds.left + bounds.width - width);
    const top = clamp(saved.top, bounds.top, bounds.top + bounds.height - height);
    features.push(`left=${left}`, `top=${top}`);
  }

  // A unique name per open stops window.open from reusing an existing popup, so each click gets its own window.
  const windowName = `${POPUP_WINDOW_NAME_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.open(url.toString(), windowName, features.join(','));
}
