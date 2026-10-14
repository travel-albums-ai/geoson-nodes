import { setSettingsStore } from '@/context/settingsStore';

type PopupGeometry = { left: number; top: number; width: number; height: number };

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

// Saved positions can point to a monitor that is no longer connected, so only restore if the window overlaps the screen.
function isOnScreen({ left, top, width, height }: PopupGeometry) {
  const { availWidth, availHeight } = window.screen;
  const { availLeft = 0, availTop = 0 } = window.screen as { availLeft?: number; availTop?: number };
  return left + width > availLeft && left < availLeft + availWidth
    && top + height > availTop && top < availTop + availHeight;
}

// Runs inside the popup itself: a navigation would detach any listener the opener attached to it.
export function initPipelinePopupWindow() {
  if (!window.name.startsWith(POPUP_WINDOW_NAME_PREFIX)) return;

  setSettingsStore({ templatesOpen: false });
  window.addEventListener('pagehide', () => {
    writeGeometry({ left: window.screenX, top: window.screenY, width: window.outerWidth, height: window.outerHeight });
  });
}

export function openPipelinePopup(pipelineId: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(POPUP_PIPELINE_PARAM, pipelineId);

  const saved = readGeometry();
  const width = clamp(saved?.width ?? DEFAULT_WIDTH, MIN_WIDTH, window.screen.availWidth);
  const height = clamp(saved?.height ?? DEFAULT_HEIGHT, MIN_HEIGHT, window.screen.availHeight);
  const features = ['popup=yes', `width=${width}`, `height=${height}`];
  if (saved && isOnScreen({ ...saved, width, height })) {
    features.push(`left=${saved.left}`, `top=${saved.top}`);
  }

  // A unique name per open stops window.open from reusing an existing popup, so each click gets its own window.
  const windowName = `${POPUP_WINDOW_NAME_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.open(url.toString(), windowName, features.join(','));
}
