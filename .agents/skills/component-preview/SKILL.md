---
name: component-preview
description: "Preview attached React components in separately named browser pages with Vite HMR. Use when someone attaches files and wants to run, inspect, style, or tweak one or more components or pipeline nodes without the rest of the application UI."
argument-hint: "<optional preview instructions>"
---

# Preview Attached Components in the Browser

Render each attached component by itself in its own browser page, using Vite development mode so edits to workspace source appear through hot module replacement (HMR).

## Select Components

1. Treat the file(s) attached to the user's request as the selection. Do not ask which component to preview when the attachments identify it. If multiple components are attached, preview every one independently.
2. Attachments may be read-only snapshots. Never edit them. Locate and import the corresponding workspace source when available; otherwise use the attachment as reference and create only the preview harness.
3. Read each component and follow its imports/hooks far enough to identify required props, providers, styles, and browser APIs. Reuse realistic sample data and harmless callbacks; do not change the target component just to make the preview render.
4. If required data or a meaningful visual state cannot be inferred, ask the user for the missing value/state before inventing one.

## Create Isolated, Named Previews

1. Create one independent preview page per attached component. Derive a stable lowercase kebab-case slug from its component or file name. For example, use `component-preview-geo-bounds-filter-node.html`, `src/__component_preview__/geo-bounds-filter-node.tsx`, and the browser title `GeoBoundsFilterNode Preview`.
2. Check whether each chosen HTML entry and module path already exists. Never overwrite user files or another component's harness. Reuse a harness only when it already previews the same component; otherwise add the same numeric suffix to both filenames.
3. Each root-level Vite HTML entry must mount only its matching preview module. Render only that component in a minimal layout with enough space to display naturally. Do not route through `src/main.tsx`, which mounts the full application.
4. Import only the styles and application providers the component needs. For app translations, initialize the existing i18n module; for MUI-themed components, use `AppProviders` from `src/context/AppProviders.tsx`.
5. For a pipeline node, render exactly one node in a minimal `@xyflow/react` `ReactFlow` canvas, with a realistic node `id`, `type`, and `data`, and the node component in `nodeTypes`. Wrap it in `AppProviders` and `ReactFlowProvider`. Keep the canvas free of the application toolbars, palette, dialogs, and unrelated nodes; do not mount `ReactFlowWrapper` or edit `pipelineConfig.tsx`.
6. Use each component's actual props and real providers/hooks rather than cloning its markup. Supply sensible preview data and callbacks for interaction. Avoid adding dependencies or changing package scripts when the existing Vite server is sufficient.

## Run and Keep HMR Active

1. Start `npm run dev` if a Vite dev server is not already running. Keep the process alive; do not use a production build or `vite preview`.
2. Open each named preview URL in its own browser page/window; never reuse one page for multiple components. Keep all component pages open concurrently. If browser control is unavailable, give the user the exact local URLs to open.
3. Confirm for every page that only its selected component is visible, it has the expected styling and interactions, and the browser console has no preview-related errors. Fix harness issues rather than hiding errors or modifying unrelated application code.
4. Leave all preview pages and the server running while the user iterates. Each preview module must import its original component directly so edits appear through HMR without a rebuild or manual refresh. Restart only if a server/configuration change requires it.
5. Finish with a clearly labeled list containing one clickable local URL per component, along with its component name. Be explicit about any unavailable data or interactions that were approximated.

## Cleanup

Keep the preview harnesses in place while the user is tweaking components. When the user asks to close the previews or the task is clearly finished, remove only the temporary HTML/modules created for those previews and stop only the dev server started for them. Preserve all changes to the target components and any pre-existing files.
