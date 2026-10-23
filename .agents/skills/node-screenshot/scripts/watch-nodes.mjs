#!/usr/bin/env node
// Re-captures the node screenshots affected by edits in src/pipeline/nodes/ComplexNodes.
//
//   npm run capture:watch -- [capture options]
//
// A changed file re-captures only the node types whose component imports it in pipelineConfig.tsx.
// A file that no registered node imports is logged and skipped.
// Capture options are passed through to capture-node.mjs. Without any, it runs
// `--mode light --theme default --concurrency 4`. Requires the dev server (npm run dev).
import { spawn } from 'node:child_process';
import { readFileSync, watch } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const watchedDir = resolve(root, 'src/pipeline/nodes/ComplexNodes');
const registryPath = resolve(root, 'src/pipeline/pipelineConfig.tsx');
const captureScript = resolve(root, '.agents/skills/node-screenshot/scripts/capture-node.mjs');
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';
const DEBOUNCE_MS = 300;
const defaultCaptureArgs = ['--mode', 'light', '--theme', 'default', '--concurrency', '4'];
const captureArgs = process.argv.slice(2).length ? process.argv.slice(2) : defaultCaptureArgs;

// Maps each ComplexNodes file, relative to the folder and without extension, to its node types.
function readNodeTypesByFile() {
  const source = readFileSync(registryPath, 'utf8');
  const importedFrom = new Map();
  for (const [, local, file] of source.matchAll(/import\s+(\w+)\s+from\s+['"]@\/pipeline\/nodes\/ComplexNodes\/([^'"]+)['"]/g)) {
    importedFrom.set(local, file);
  }
  const block = source.match(/pipelineNodeTypes\s*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  const byFile = new Map();
  for (const [, type, local] of block.matchAll(/^\s*'([^']+)'\s*:\s*(\w+)/gm)) {
    const file = importedFrom.get(local);
    if (file) byFile.set(file, [...(byFile.get(file) ?? []), type]);
  }
  return byFile;
}

function typesForChanges(changedNames, byFile) {
  const types = new Set();
  for (const name of changedNames) {
    const nodeTypes = byFile.get(name.replace(/\.[^./]+$/, ''));
    if (nodeTypes) nodeTypes.forEach((type) => types.add(type));
  }
  return [...types];
}

// Skips editor swap and backup files, which are not part of the source.
const isIgnored = (name) => /(^|\/)\.|~$|\.(swp|tmp)$/.test(name);

const pendingFiles = new Set();
const pendingTypes = new Set();
let debounce;
let capture = null;

function drain() {
  if (capture || pendingTypes.size === 0) return;
  const types = [...pendingTypes];
  pendingTypes.clear();
  console.log(`[watch] capturing ${types.join(', ')}`);
  capture = spawn(process.execPath, [captureScript, ...types, ...captureArgs], { cwd: root, stdio: 'inherit' });
  const finish = (code) => {
    capture = null;
    console.log(`[watch] capture finished (exit ${code})`);
    drain();
  };
  capture.on('error', (error) => {
    console.error(`[watch] could not start capture: ${error.message}`);
    finish(1);
  });
  capture.on('exit', finish);
}

function flush() {
  const names = [...pendingFiles];
  pendingFiles.clear();
  const types = typesForChanges(names, readNodeTypesByFile());
  console.log(`[watch] changed: ${names.join(', ')}`);
  if (types.length === 0) {
    console.log('[watch] no registered node uses the changed file(s), nothing to capture');
    return;
  }
  types.forEach((type) => pendingTypes.add(type));
  drain();
}

async function isUp() {
  try {
    return (await fetch(baseUrl)).ok;
  } catch {
    return false;
  }
}

if (!(await isUp())) {
  console.error(`No dev server at ${baseUrl}. Start it with "npm run dev" and run this again.`);
  process.exit(1);
}

const watcher = watch(watchedDir, { recursive: true }, (_event, name) => {
  if (!name || isIgnored(name)) return;
  pendingFiles.add(name);
  clearTimeout(debounce);
  debounce = setTimeout(flush, DEBOUNCE_MS);
});
console.log(`[watch] watching ${relative(root, watchedDir)} (Ctrl+C to stop)`);

process.on('SIGINT', () => {
  watcher.close();
  capture?.kill();
  process.exit(0);
});
