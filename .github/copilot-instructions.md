# AwapiPDF — Copilot Instructions

## Project Overview

AwapiPDF is a cross-platform desktop PDF reader/writer powered by AI, built with **Tauri v2** (Rust backend) and **React 19** + **TypeScript** (frontend). It uses **PDF.js** for rendering and **Vite** as the build tool.

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Desktop   | Tauri v2 (2.10.x)                       |
| Frontend  | React 19, TypeScript 5.8, Vite 7        |
| PDF       | pdfjs-dist (rendering, text, forms)     |
| Testing   | Vitest, @testing-library/react, jsdom   |
| Backend   | Rust (edition 2021)                     |
| Task runner | [justfile](../justfile) — use `just <recipe>` |

## Project Structure

```
src/                     # React frontend
  App.tsx                # Root component — state, layout, tool wiring
  App.css                # All styles (CSS variables, dark/light themes)
  main.tsx               # React entry point
  components/            # UI components (Toolbar, Sidebar, PdfViewer, etc.)
  hooks/                 # Custom hooks (usePdfDocument, useSearch, useAnnotations, etc.)
  types/                 # TypeScript type definitions (annotations.ts)
  test/                  # Unit tests (Vitest)
src-tauri/               # Rust backend
  src/lib.rs             # Plugin registration
  src/main.rs            # Entry point
  Cargo.toml             # Rust dependencies
  tauri.conf.json        # Tauri app config
  capabilities/          # Permission declarations
```

## Common Commands

Use `just` for all common tasks:

```sh
just dev          # Run full Tauri app (frontend + backend)
just test         # Run frontend unit tests (vitest run)
just test-watch   # Run tests in watch mode
just test-rust    # Run Rust tests
just check        # TypeScript type-check (tsc --noEmit)
just check-rust   # cargo check
just clippy       # Rust linting
just build        # Production build
just install      # Install all dependencies (npm + cargo)
just clean        # Remove build artifacts
```

## Code Conventions

### TypeScript / React

- Use **functional components** with hooks — no class components.
- Custom hooks go in `src/hooks/` and are named `use<Feature>.ts`.
- Component files go in `src/components/` — one component per file, named export matching the filename.
- Types/interfaces shared across files go in `src/types/`.
- Use `useCallback` for event handlers and functions passed as props.
- Use `useRef` for DOM references and mutable values that don't trigger re-renders.
- Prefer explicit imports from libraries (e.g., `import { TextLayer } from "pdfjs-dist"`).

### Styling

- All CSS lives in `src/App.css` using CSS custom properties (variables).
- Dark theme is the default (`:root`); light theme uses `[data-theme="light"]`.
- Class names use kebab-case (e.g., `toolbar-btn`, `pdf-page-wrapper`).

### Rust

- The Rust backend is minimal — plugin registration and Tauri commands in `lib.rs`.
- Crate name is `awapi_pdf_lib`.

### Tauri

- App identifier: `com.awapi.pdf`
- Window defaults: 1200×800, min 640×480
- Plugins: dialog, fs, opener
- Capabilities/permissions declared in `src-tauri/capabilities/default.json`

## Testing Requirements

- **Unit tests are mandatory** for all new or updated hooks, utility functions, and non-trivial logic.
- Tests live in `src/test/` and follow the naming convention `<module>.test.ts`.
- Mock external dependencies (Tauri plugins, pdfjs-dist) with `vi.mock()`.
- Use `renderHook` + `act` from `@testing-library/react` for testing hooks.
- Run `just test` (or `npm test`) to verify — all tests must pass before considering work complete.
- Test file setup is in `src/test/setup.ts`.

## Architecture Notes

- **PDF rendering pipeline**: `usePdfDocument` hook → `PdfViewer` component renders canvas + TextLayer + PDF.js AnnotationLayer (forms) + custom AnnotationLayer (highlights/notes/draw).
- **Annotation system**: Types in `src/types/annotations.ts`, state in `useAnnotations` hook, rendering in `AnnotationLayer` component. Coordinates are normalised to [0..1] relative to page dimensions.
- **Search**: `useSearch` hook extracts text from all pages via `getTextContent()` and does case-insensitive matching.
- **Keyboard shortcuts**: `useKeyboardShortcuts` hook registers global key handlers (Cmd/Ctrl combos).

## Important Patterns

- When adding a new tool/feature to the toolbar, follow the existing pattern: add prop to `ToolbarProps`, wire in `App.tsx`, implement in the appropriate hook/component.
- PDF.js worker is configured in `usePdfDocument.ts` — don't duplicate the worker setup.
- Tauri plugin permissions must be added to both `Cargo.toml` (dependency), `lib.rs` (plugin registration), and `capabilities/default.json` (permissions).
