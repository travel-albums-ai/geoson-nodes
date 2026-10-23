---
name: component-preview
description: "Select and preview a React component in an isolated browser page with Vite HMR. Use when someone wants to run, inspect, style, or tweak a selected component or pipeline node without the rest of the application UI."
argument-hint: "<component file or symbol, optional>"
---

# Preview a Component in the Browser

Render the user's selected component by itself in a real browser, using the Vite development server so edits to the component appear through hot module replacement (HMR).

## Select the Component

1. Resolve the target from the user's explicit file or symbol, editor selection, attached source, or current conversation. If there are multiple plausible targets, ask which one to preview.
2. Read the component and follow its imports/hooks far enough to identify required props, providers, styles, and browser APIs. Reuse realistic sample data and harmless callbacks; do not change the target component just to make the preview render.
3. If required data or a meaningful visual state cannot be inferred, ask the user for the missing value/state before inventing one.

## Create an Isolated Preview

1. Check that `component-preview.html` and `src/__component_preview__/main.tsx` do not already exist. Never overwrite existing files. Reuse a preview harness already present if it targets this component; otherwise choose unique preview filenames.
2. Add a temporary Vite HTML entry at the repository root which mounts only `src/__component_preview__/main.tsx`. The entry should contain a root element and a module script; do not route through `src/main.tsx`, which mounts the full application.
3. In the preview entry module, render just the selected component in a minimal layout that centers it and gives it enough space to display naturally. Import only the styles and application providers the component actually needs. For app translations, initialize the existing i18n module; for MUI-themed components, use `AppProviders` from `src/context/AppProviders.tsx`.
4. For a pipeline node, render exactly one node in a minimal `@xyflow/react` `ReactFlow` canvas, with a realistic node `id`, `type`, and `data`, and the node component in `nodeTypes`. Wrap it in `AppProviders` and `ReactFlowProvider`. Keep the canvas free of the application toolbars, palette, dialogs, and unrelated nodes; do not mount `ReactFlowWrapper` or edit `pipelineConfig.tsx`.
5. Use the component's actual props and its real providers/hooks rather than cloning its markup. Supply sensible preview data and callbacks for interaction. Avoid adding dependencies or changing package scripts when the existing Vite server is sufficient.

## Run and Keep HMR Active

1. Start `npm run dev` if a Vite dev server is not already running. Keep the process alive; do not use a production build or `vite preview`.
2. Open the preview HTML route (normally `/component-preview.html`) in the available browser integration. If browser control is unavailable, give the user the exact local URL to open.
3. Confirm that only the selected component is visible, it has the expected styling and interactions, and the browser console has no preview-related errors. Fix harness issues rather than hiding errors or modifying unrelated application code.
4. Leave the preview page and server running while the user iterates. Because the preview entry imports the original component directly and Vite serves it in development mode, edits to that component should update through HMR without a rebuild or manual refresh. Restart only if a server/configuration change requires it.
5. Tell the user which component is displayed and the browser URL. Be explicit about any unavailable data or interactions that were approximated.

## Cleanup

Keep the preview harness in place for as long as the user is tweaking the component. When the user asks to close the preview or the task is clearly finished, remove only the temporary preview HTML/module created for this session and stop only the dev server started for this preview. Preserve all changes to the target component and any pre-existing files.
