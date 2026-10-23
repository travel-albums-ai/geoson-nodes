#!/usr/bin/env node
// Captures ONE pipeline node, alone and centred at 100% zoom, on an exact 800x600 canvas.
//
//   node .agents/skills/node-screenshot/scripts/capture-node.mjs <node-type> [options]
//   node .agents/skills/node-screenshot/scripts/capture-node.mjs --all
//
// Options:
//   --out <file>          Output PNG (default: screenshots/node-<type>.png)
//   --theme <light|dark>  Default: light
//   --transparent         Transparent PNG background instead of the canvas colour
//   --handles             Keep the connection handles (hidden by default)
//   --wait <ms>           Settle time after the node renders (default 800)
//   --all                 Capture every type in pipelineNodeTypes
//   --list                Print the node types and exit
//   --headed              Show the browser
//
// Env: PLAYWRIGHT_BASE_URL (default http://localhost:5173). If nothing answers there,
// a Vite dev server is started and stopped automatically.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WIDTH = 800;
const HEIGHT = 600;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const themesRoot = resolve(root, 'src/themes');
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
const MODES = ['light', 'dark'];

function parseArgs(argv) {
  const opts = { types: [], themes: [], modes: [], wait: 800 };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') opts.out = argv[++i];
    else if (arg === '--theme') opts.themes.push(argv[++i]);
    else if (arg === '--mode') opts.modes.push(argv[++i]);
    else if (arg === '--wait') opts.wait = Number(argv[++i]);
    else if (arg === '--transparent') opts.transparent = true;
    else if (arg === '--handles') opts.handles = true;
    else if (arg === '--headed') opts.headed = true;
    else if (arg === '--all') opts.all = true;
    else if (arg === '--list') opts.list = true;
    else if (arg === '--list-themes') opts.listThemes = true;
    else if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
    else opts.types.push(arg);
  }
  return opts;
}

// The nodeTypes map in pipelineConfig.tsx is the single source of truth for valid types.
function readNodeTypes() {
  const source = readFileSync(resolve(root, 'src/pipeline/pipelineConfig.tsx'), 'utf8');
  const block = source.match(/pipelineNodeTypes\s*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  return [...block.matchAll(/^\s*'([^']+)'\s*:/gm)].map((match) => match[1]);
}

function findThemeFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return findThemeFiles(path);
    return entry.isFile() && entry.name.endsWith('.theme.ts') ? [path] : [];
  });
}

function themeSlug(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Match themeDiscovery's id generation while retaining a filesystem-safe folder slug.
function readThemes() {
  const byId = new Map();
  const files = findThemeFiles(themesRoot).sort();
  for (const path of files) {
    const source = readFileSync(path, 'utf8');
    const basename = path.split('/').at(-1).replace(/\.theme\.ts$/, '');
    const name = source.match(/export\s+const\s+(?:name|themeName)\s*=\s*(['"])(.*?)\1/)?.[2]
      ?? source.match(/export\s+default\s+\{[\s\S]*?\bname\s*:\s*(['"])(.*?)\1/)?.[2]
      ?? basename;
    const id = String(name).replace(/\s+/g, '-').toLowerCase();
    if (!byId.has(id)) byId.set(id, { id, slug: themeSlug(name), name });
  }
  const themes = [...byId.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  const slugs = new Set();
  for (const theme of themes) {
    if (!theme.slug) throw new Error(`Theme "${theme.name}" has no filesystem-safe name`);
    if (slugs.has(theme.slug)) throw new Error(`Theme folder name collision: ${theme.slug}`);
    slugs.add(theme.slug);
  }
  return themes;
}

async function isUp(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isUp(baseUrl)) return () => {};
  const port = new URL(baseUrl).port || '5173';
  const server = spawn('npx', ['vite', '--port', port, '--strictPort'], { cwd: root, stdio: 'ignore' });
  for (let i = 0; i < 120; i++) {
    if (await isUp(baseUrl)) return () => server.kill();
    await new Promise((done) => setTimeout(done, 500));
  }
  server.kill();
  throw new Error(`Dev server did not start at ${baseUrl}`);
}

// Everything except the node is made invisible, and the node is lifted out of the pan/zoom
// transform and fixed at the viewport centre. Zoom is therefore 1:1 by construction,
// whatever the React Flow viewport currently is.
const isolateCss = ({ keepHandles, transparent, background }) => `
  html, body { background: ${transparent ? 'transparent' : background} !important; overflow: hidden !important; }
  body * { visibility: hidden !important; }
  [data-shot-target], [data-shot-target] * { visibility: visible !important; }
  [data-shot-target] {
    position: fixed !important; inset: auto !important; left: 50% !important; top: 50% !important;
    transform: translate(-50%, -50%) !important; translate: none !important; scale: none !important;
    margin: 0 !important; animation: none !important; z-index: 2147483647 !important;
  }
  [data-shot-ancestor] {
    transform: none !important; filter: none !important; perspective: none !important;
    contain: none !important; overflow: visible !important; background: transparent !important;
  }
  [data-shot-target] .react-flow__resize-control { visibility: hidden !important; }
  ${keepHandles ? '' : '[data-shot-target] .react-flow__handle { visibility: hidden !important; }'}
  * { caret-color: transparent !important; }
`;

async function capture(browser, type, mode, theme, opts) {
  const out = resolve(root, opts.out ?? `screenshots-${mode}-${theme.slug}/node-${type}.png`);
  mkdirSync(dirname(out), { recursive: true });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    colorScheme: mode,
  });
  try {
    // Fresh app every run: no restored pipeline, requested theme.
    await context.addInitScript(({ mode: themeMode, themeId }) => {
      try {
        sessionStorage.clear();
        localStorage.setItem('settingsStore', JSON.stringify({ themeMode, themeId }));
      } catch { /* storage unavailable */ }
    }, { mode, themeId: theme.id });
    const page = await context.newPage();
    const problems = [];
    page.on('pageerror', (error) => problems.push(error.message));

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.reactflow-canvas', { timeout: 30_000 });
    const appliedTheme = await page.evaluate(async ({ mode: themeMode, themeId }) => {
      const { ensureThemeDiscovery } = await import('/src/discovery/themeDiscovery.ts');
      await ensureThemeDiscovery();
      const { themeRegistry } = await import('/src/discovery/themeRegistry.ts');
      const themeModule = themeRegistry.get(themeId)?.module;
      const lightTheme = themeModule?.lightTheme ?? themeModule?.defaultLightTheme ?? themeModule?.[`${themeId}LightTheme`];
      const darkTheme = themeModule?.darkTheme ?? themeModule?.defaultDarkTheme ?? themeModule?.[`${themeId}DarkTheme`];
      const theme = themeMode === 'light' ? lightTheme ?? darkTheme : darkTheme ?? lightTheme;
      if (!theme) throw new Error(`Discovered theme "${themeId}" has no ${themeMode} theme`);
      const { setSettingsStore } = await import('/src/context/settingsStore.ts');
      setSettingsStore((previous) => ({ ...previous, themeMode, themeId: 'default' }));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      setSettingsStore((previous) => ({ ...previous, themeMode, themeId }));
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      return {
        expectedAccent: theme.palette.primary.main,
        actualAccent: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),
      };
    }, { mode, themeId: theme.id });
    if (appliedTheme.actualAccent.toLowerCase() !== appliedTheme.expectedAccent.toLowerCase()) {
      throw new Error(`Theme "${theme.id}" did not apply: expected accent ${appliedTheme.expectedAccent}, got ${appliedTheme.actualAccent}`);
    }
    const viewport = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }));
    if (viewport.width !== WIDTH || viewport.height !== HEIGHT) {
      throw new Error(`Expected an ${WIDTH}x${HEIGHT} viewport, got ${viewport.width}x${viewport.height}`);
    }

    // Same payload the toolbox sets on dragstart, dropped at the canvas centre.
    await page.evaluate((nodeType) => {
      const canvas = document.querySelector('.reactflow-canvas');
      const rect = canvas.getBoundingClientRect();
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('application/reactflow', nodeType);
      canvas.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }));
    }, type);

    const node = page.locator(`.react-flow__node-${type}`);
    await node.first().waitFor({ state: 'visible', timeout: 15_000 });
    if ((await node.count()) !== 1) throw new Error(`Expected one ${type} node, found ${await node.count()}`);

    // Deselect (hides the resizer) and park the pointer (no hover border/glow).
    await page.mouse.click(2, 2);
    await page.mouse.move(0, 0);
    await page.waitForTimeout(opts.wait);

    const background = await page.evaluate(({ selector }) => {
      const target = document.querySelector(selector);
      target.setAttribute('data-shot-target', '');
      for (let el = target.parentElement; el; el = el.parentElement) el.setAttribute('data-shot-ancestor', '');
      return getComputedStyle(document.querySelector('.react-flow')).backgroundColor;
    }, { selector: `.react-flow__node-${type}` });
    await page.addStyleTag({ content: isolateCss({ keepHandles: opts.handles, transparent: opts.transparent, background }) });
    await page.waitForTimeout(150);

    const box = await node.first().boundingBox();
    if (box.width > WIDTH || box.height > HEIGHT) {
      throw new Error(`${type} node is ${Math.round(box.width)}x${Math.round(box.height)}px and does not fit the ${WIDTH}x${HEIGHT} canvas`);
    }
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    if (Math.abs(centerX - WIDTH / 2) > 0.5 || Math.abs(centerY - HEIGHT / 2) > 0.5) {
      throw new Error(`${type} node is not centered: center is (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
    }

    const screenshot = await page.screenshot({
      clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT },
      omitBackground: !!opts.transparent,
    });
    if (screenshot.readUInt32BE(16) !== WIDTH || screenshot.readUInt32BE(20) !== HEIGHT) {
      throw new Error(`Expected an ${WIDTH}x${HEIGHT} PNG, got ${screenshot.readUInt32BE(16)}x${screenshot.readUInt32BE(20)}`);
    }
    writeFileSync(out, screenshot);
    console.log(`${type} [${mode}, ${theme.slug}] -> ${out} (node ${Math.round(box.width)}x${Math.round(box.height)}, ${statSync(out).size} bytes)`);
    if (problems.length) console.log(`  page errors: ${problems.slice(0, 3).join(' | ')}`);
    return true;
  } finally {
    await context.close();
  }
}

const opts = parseArgs(process.argv.slice(2));
const known = readNodeTypes();
const themes = readThemes();
if (opts.list || opts.listThemes) {
  if (opts.list && opts.listThemes) {
    console.error('Use either --list or --list-themes, not both');
    process.exit(2);
  }
  if (opts.listThemes) {
    console.log(themes.map(({ id, slug }) => `${id}\t${slug}`).join('\n'));
    process.exit(0);
  }
  console.log(known.join('\n'));
  process.exit(0);
}
const types = opts.all ? known : opts.types;
if (!types.length) {
  console.error('Usage: capture-node.mjs <node-type> [options] | --all | --list | --list-themes');
  process.exit(2);
}
const unknown = types.filter((type) => !known.includes(type));
if (unknown.length) {
  console.error(`Unknown node type(s): ${unknown.join(', ')}\nValid: ${known.join(', ')}`);
  process.exit(2);
}
const unknownModes = opts.modes.filter((mode) => !MODES.includes(mode));
if (unknownModes.length) {
  console.error(`Unknown mode(s): ${unknownModes.join(', ')}\nValid: ${MODES.join(', ')}`);
  process.exit(2);
}
const selectedThemeIds = new Set();
for (const requested of opts.themes) {
  const theme = themes.find(({ id, slug }) => id === requested || slug === requested);
  if (!theme) {
    console.error(`Unknown theme "${requested}"\nValid themes:\n${themes.map(({ id, slug }) => `  ${id} (${slug})`).join('\n')}`);
    process.exit(2);
  }
  selectedThemeIds.add(theme.id);
}
const selectedThemes = opts.themes.length
  ? themes.filter(({ id }) => selectedThemeIds.has(id))
  : themes;
const selectedModes = opts.modes.length ? [...new Set(opts.modes)] : MODES;
if (opts.out && (types.length !== 1 || selectedThemes.length !== 1 || selectedModes.length !== 1)) {
  console.error('--out requires one node type, one --theme, and one --mode');
  process.exit(2);
}

const stopServer = await ensureServer();
let browser;
let failed = false;
try {
  browser = await chromium.launch({ headless: !opts.headed });
  for (const theme of selectedThemes) {
    for (const mode of selectedModes) {
      for (const type of types) {
        try {
          if (!(await capture(browser, type, mode, theme, opts))) failed = true;
        } catch (error) {
          failed = true;
          console.error(`${type} [${mode}, ${theme.slug}] FAILED: ${error.message}`);
        }
      }
    }
  }
} finally {
  await browser?.close();
  stopServer();
}
process.exit(failed ? 1 : 0);
