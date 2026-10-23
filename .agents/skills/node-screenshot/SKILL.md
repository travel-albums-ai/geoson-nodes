---
name: node-screenshot
description: "Capture an individual GeoSon pipeline node with Playwright on an exact 800x600 canvas, centered at 100% scale with surrounding UI hidden. Use when creating, refreshing, or checking node screenshots."
argument-hint: "<node-type | --all> [capture options]"
---

# Capture Pipeline Node Screenshots

Use the bundled [capture script](./scripts/capture-node.mjs) to render one pipeline node by itself. It starts the Vite dev server when needed, adds the requested node to a fresh pipeline, hides surrounding UI, and saves an 800x600 PNG with the node centered at 100% scale.

## Run

From the repository root:

```sh
npm run capture:node -- geojson-input
npm run capture:nodes
```

Use `npm run capture:node -- --list` to see the valid names from `pipelineNodeTypes` in `src/pipeline/pipelineConfig.tsx`. Node names are the registry keys, not component names.

Options can be passed after `--`:

```sh
npm run capture:node -- geojson-input --theme dark
npm run capture:node -- geojson-input --out screenshots/input.png --transparent
npm run capture:node -- geojson-input --handles
```

Direct invocation also works:

```sh
node .agents/skills/node-screenshot/scripts/capture-node.mjs <node-type>
```

Set `PLAYWRIGHT_BASE_URL` to use an already-running app at a different URL. Use `--headed` to inspect the browser and `--wait <ms>` if a node needs more time to settle. `--all` captures every registered node to `screenshots/node-<node-type>.png`.

## Isolation and styling guidance

The capture script deliberately changes visibility and positioning, not the app DOM:

1. Start from a clean browser context at an 800x600 viewport and device scale factor 1. Clear saved pipeline state so only the requested node is added.
2. Deselect the node and move the pointer away before capture to avoid selection handles, resize controls, and hover-only decorations.
3. Mark the exact `.react-flow__node-<node-type>` as the capture target. The isolation CSS hides every page descendant, then restores visibility only for the target and its descendants. This removes the toolbox, toolbar, edges, grid, controls, minimap, dialogs, and other surrounding UI without deleting application elements.
4. Mark the target's ancestors and neutralize their transforms, filters, perspective, containment, overflow, and backgrounds. This breaks React Flow's pan/zoom and clipping context while preserving the target's own styles and meaningful content.
5. Fix the target at `left: 50%; top: 50%` with a `translate(-50%, -50%)` transform. The viewport transform no longer scales the node, so it is shown at 100% CSS scale. Keep connection handles hidden by default; use `--handles` only when the handles are part of the desired image.
6. Keep the canvas background color by default, or use `--transparent` to omit it. The script refuses to save a node larger than the canvas rather than silently cropping it, and checks that the output PNG is exactly 800x600 and the target is centered.

If a future node has a decoration that should not appear, hide only that decoration under `[data-shot-target]` in `isolateCss`; do not broaden the page-wide hiding rule or hide node content globally. If a node's actual content is clipped by its own styles, adjust that node's styling rather than shrinking the screenshot or scaling the target.

## Adding or refreshing captures

Capture one node at a time while iterating on its appearance. Keep the default output naming convention, then inspect the saved PNG. Use `--all` only when intentionally regenerating every node capture. A nonzero exit code means the node did not fit, a Playwright step failed, or the screenshot dimensions/centering did not meet the checks; fix the cause before using the image.
