#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const args = process.argv.slice(2);

function usage() {
  console.log('Usage: node .agents/skills/react-component-preview/scripts/create-preview.mjs <source-file> [<source-file> ...] [--export ExportName] [--slug name]');
}

function parseArgs() {
  if (args.includes('--help')) {
    usage();
    return null;
  }

  const sourceFiles = [];
  let exportName = null;
  let requestedSlug = null;

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    const value = args[index + 1];

    if (option === '--export' && value) {
      exportName = value;
      index += 1;
    } else if (option === '--slug' && value) {
      requestedSlug = value;
      index += 1;
    } else if (option.startsWith('--')) {
      throw new Error(`Unknown or incomplete option: ${option}`);
    } else {
      sourceFiles.push(option);
    }
  }

  if (sourceFiles.length === 0) {
    usage();
    throw new Error('Provide at least one source file.');
  }

  if (sourceFiles.length > 1 && (exportName || requestedSlug)) {
    throw new Error('--export and --slug can only be used with one source file.');
  }

  if (exportName && !/^[A-Za-z_$][\w$]*$/.test(exportName)) {
    throw new Error(`Invalid JavaScript export name: ${exportName}`);
  }

  return { sourceFiles, exportName, requestedSlug };
}

function slugify(value) {
  const slug = value
    .replace(/\.[^.]+$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    throw new Error(`Cannot derive a preview slug from "${value}".`);
  }

  return slug;
}

function sourceSpecifier(sourcePath) {
  const sourceFromSrc = path.relative(path.join(repositoryRoot, 'src'), sourcePath);
  if (sourceFromSrc.startsWith('..') || path.isAbsolute(sourceFromSrc)) {
    throw new Error('The component source must be inside the workspace src/ directory for Vite HMR.');
  }
  return `@/${sourceFromSrc.split(path.sep).join('/')}`;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function findAvailableName(baseSlug) {
  for (let suffix = 1; ; suffix += 1) {
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const htmlPath = path.join(repositoryRoot, `component-preview-${slug}.html`);
    const modulePath = path.join(repositoryRoot, 'src', '__react_component_preview__', `${slug}.tsx`);
    const [htmlExists, moduleExists] = await Promise.all([pathExists(htmlPath), pathExists(modulePath)]);
    if (!htmlExists && !moduleExists) return { slug, htmlPath, modulePath };
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function htmlContent(title, modulePath) {
  const moduleFromRoot = `/${path.relative(repositoryRoot, modulePath).split(path.sep).join('/')}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)} Preview</title>
    <style>
      html, body, #root { min-width: 100%; min-height: 100%; margin: 0; }
      #root { min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${moduleFromRoot}"></script>
  </body>
</html>
`;
}

function moduleContent(slug, specifier, exportName) {
  const componentImport = exportName
    ? `import { ${exportName} as PreviewComponent } from ${JSON.stringify(specifier)};`
    : `import PreviewComponent from ${JSON.stringify(specifier)};`;

  return `import { createRoot, type Root } from 'react-dom/client';
${componentImport}

declare global {
  interface Window {
    __REACT_COMPONENT_PREVIEW_ROOTS__?: Record<string, Root>;
  }
}

const container = document.getElementById('root');
if (!container) throw new Error('React component preview root element is missing.');

const roots = window.__REACT_COMPONENT_PREVIEW_ROOTS__ ??= {};
const root = roots[${JSON.stringify(slug)}] ??= createRoot(container);
root.render(<PreviewComponent />);
`;
}

async function main() {
  const options = parseArgs();
  if (!options) return;

  const components = [];
  for (const sourceFile of options.sourceFiles) {
    const sourcePath = path.resolve(process.cwd(), sourceFile);
    const sourceStat = await fs.stat(sourcePath);
    if (!sourceStat.isFile()) throw new Error(`Not a file: ${sourcePath}`);

    const sourcePathFromRoot = path.relative(repositoryRoot, sourcePath);
    if (sourcePathFromRoot.startsWith('..') || path.isAbsolute(sourcePathFromRoot)) {
      throw new Error(`The source file must be inside this workspace: ${sourcePath}`);
    }

    components.push({
      sourcePath,
      sourceSpecifier: sourceSpecifier(sourcePath),
      baseSlug: slugify(options.requestedSlug ?? path.basename(sourcePath)),
      displayName: path.basename(sourcePath).replace(/\.[^.]+$/, ''),
    });
  }

  for (const component of components) {
    const { slug, htmlPath, modulePath } = await findAvailableName(component.baseSlug);
    await fs.mkdir(path.dirname(modulePath), { recursive: true });

    let moduleCreated = false;
    try {
      await fs.writeFile(modulePath, moduleContent(slug, component.sourceSpecifier, options.exportName), { flag: 'wx' });
      moduleCreated = true;
      await fs.writeFile(htmlPath, htmlContent(component.displayName, modulePath), { flag: 'wx' });
    } catch (error) {
      if (moduleCreated) await fs.rm(modulePath, { force: true });
      throw error;
    }

    console.log(`Created: ${path.relative(repositoryRoot, htmlPath)}`);
    console.log(`Created: ${path.relative(repositoryRoot, modulePath)}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
