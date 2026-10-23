---
name: react-component-preview
description: "Render attached React components by themselves in named Vite browser pages with HMR. Use when someone supplies component files and wants quick isolated previews and links."
argument-hint: "<optional preview instructions>"
---

# Preview Simple React Components

Create a separate, minimal Vite page for every attached React component so the user can inspect and tweak it with HMR.

## Workflow

1. Treat the attached files as the requested components. Do not edit attached snapshots; locate and import the corresponding workspace source when available.
2. Read each source far enough to identify its export, props, styles, providers, hooks, and browser API requirements. Keep the preview simple, but provide necessary app context and realistic props/callbacks. Do not change the target component to make it render.
3. From the repository root, scaffold each component using:

   ```sh
   node .agents/skills/react-component-preview/scripts/create-preview.mjs src/path/to/FirstComponent.tsx src/path/to/SecondComponent.tsx
   ```

   For one named export, pass `--export ExportName`. Optionally pass `--slug custom-name` for one component. The script creates a uniquely named root HTML page and a matching module under `src/__react_component_preview__/` for every source; if names exist, it adds the same numeric suffix to both. It never overwrites existing files.
4. Update only the generated module as needed to import required styles, provide app contexts, and pass props. Render the actual component rather than reproducing its markup. Keep the surrounding page minimal and let the component display naturally.
5. Start `npm run dev` if a Vite development server is not already running. Do not use a production build or `vite preview`.
6. Open each generated HTML URL in a separate browser page. Keep all pages open concurrently and return a labeled clickable link for every component.
7. Verify each page renders its selected component without preview-related console errors. Leave the pages and server running while the user iterates; imports from workspace source keep edits live through HMR.

## Constraints

- Keep preview pages independent; never mount the full application.
- Do not edit read-only attachments or unrelated application files.
- If source code requires data, providers, or an interaction that cannot reasonably be inferred, ask the user rather than inventing a misleading state.
- Do not overwrite existing pages or modules. Preserve preview files while the user is tweaking; remove only files created for this task when they ask to close or clean up previews.
