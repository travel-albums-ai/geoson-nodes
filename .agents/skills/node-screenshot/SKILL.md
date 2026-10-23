---
name: node-screenshot
description: "Capture GeoSon pipeline node screenshots with Playwright on an exact 800x600 canvas, centered at 100% scale with surrounding UI hidden. Use when creating, refreshing, or checking node screenshots across discovered light/dark themes."
argument-hint: "<node-type | --all> [capture options]"
---

# Capture Pipeline Node Screenshots

Use the bundled [capture script](./scripts/capture-node.mjs) to render pipeline nodes by themselves. It starts the Vite dev server when needed, adds each requested node to a fresh pipeline, hides surrounding UI, and saves an 800x600 PNG with the node centered at 100% scale. By default, it captures every discovered theme in both light and dark modes.

## Run

From the repository root:

```sh
npm run capture:node -- geojson-input
npm run capture:nodes
```

The first command captures `geojson-input` in every theme and mode. The second captures every registered node in every discovered theme and mode. Use `npm run capture:node -- --list` to see valid node registry keys from `src/pipeline/pipelineConfig.tsx`, and `npm run capture:node -- --list-themes` to list discovered theme IDs and output slugs.

Options can be passed after `--`:

```sh
npm run capture:node -- geojson-input --mode dark
npm run capture:node -- geojson-input --theme catppuccin
npm run capture:node -- geojson-input --theme catppuccin --mode dark --out /tmp/catppuccin-dark.png
npm run capture:node -- geojson-input --handles
```

Direct invocation also works:

```sh
node .agents/skills/node-screenshot/scripts/capture-node.mjs <node-type> [options]
```

`--theme <id-or-slug>` narrows the capture to one discovered theme; repeat it to choose several. `--mode <light|dark>` narrows to one mode; repeat it to choose both. Without either option, all discovered themes and both modes are captured. Outputs go into `screenshots-<mode>-<theme-slug>/node-<node-type>.png`, for example `screenshots-dark-catppuccin/node-geojson-input.png`. `--all` expands the node selection to every registered type and still captures every selected theme/mode combination.

`--concurrency <1-4>` sets how many captures run at once (default `1`, sequential). Each capture uses its own browser context, so higher values reduce wall-clock time without changing the output. For example, `npm run capture:nodes -- --mode light --theme default --concurrency 4`.

`--out` overrides the output path and therefore requires exactly one node, one theme, and one mode to be selected. Set `PLAYWRIGHT_BASE_URL` to use an already-running Vite app at a different URL. Use `--headed` to inspect the browser and `--wait <ms>` if a node needs more time to settle.

## Isolation and styling guidance

The capture script deliberately changes visibility and positioning, not the app DOM:

1. Start from a clean browser context at an 800x600 viewport and device scale factor 1. Clear per-tab pipeline state and set the app's `settingsStore` to the requested discovered theme and mode. Load the app's theme discovery registry before capture, then add only the requested node.
2. Deselect the node and move the pointer away before capture to avoid selection handles, resize controls, and hover-only decorations.
3. Mark the exact `.react-flow__node-<node-type>` as the capture target. The isolation CSS hides every page descendant, then restores visibility only for the target and its descendants. This removes the toolbox, toolbar, edges, grid, controls, minimap, dialogs, and other surrounding UI without deleting application elements.
4. Mark the target's ancestors and neutralize their transforms, filters, perspective, containment, overflow, and backgrounds. This breaks React Flow's pan/zoom and clipping context while preserving the target's own styles and meaningful content.
5. Fix the target at `left: 50%; top: 50%` with a `translate(-50%, -50%)` transform. The viewport transform no longer scales the node, so it is shown at 100% CSS scale. Keep connection handles hidden by default; use `--handles` only when the handles are part of the desired image.
6. Keep the canvas background color by default, or use `--transparent` to omit it. The script refuses to save a node larger than the canvas rather than silently cropping it, and checks that the output PNG is exactly 800x600 and the target is centered.

If a future node has a decoration that should not appear, hide only that decoration under `[data-shot-target]` in `isolateCss`; do not broaden the page-wide hiding rule or hide node content globally. If a node's actual content is clipped by its own styles, adjust that node's styling rather than shrinking the screenshot or scaling the target.

## Adding or refreshing captures

Theme discovery scans `src/themes/**/*.theme.ts`, derives IDs using the app's discovery convention, and creates a filesystem-safe slug for each output folder. When adding a theme module, no script changes are needed. Capture one node/theme/mode while iterating on its appearance; use `--all` when intentionally regenerating the complete node/theme/mode set. A nonzero exit code means at least one node did not fit, a Playwright step failed, or a screenshot dimensions/centering check failed; fix the cause before using that image.
