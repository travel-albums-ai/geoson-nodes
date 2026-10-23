import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

declare global {
  interface Window {
    __COMPONENT_PREVIEW_ROOT__?: Root;
  }
}

export function renderPreviewRoot(content: ReactNode) {
  const container = document.getElementById('root');
  if (!container) throw new Error('Component preview root element is missing.');

  const root = window.__COMPONENT_PREVIEW_ROOT__ ??= createRoot(container);
  root.render(content);
}
