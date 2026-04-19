# Contributing to AwapiPDF

Thanks for your interest in contributing to AwapiPDF! This document explains how to get started.

## Prerequisites

- **Node.js** (LTS)
- **Rust** (stable, edition 2021)
- **Tauri v2 prerequisites** — see [Tauri Getting Started](https://v2.tauri.app/start/prerequisites/)
- [just](https://github.com/casey/just) command runner

## Getting Started

```sh
# Clone the repo
git clone https://github.com/omeryesil/awapi-pdf.git
cd awapi-pdf

# Install dependencies
just install

# Run the app in development mode
just dev
```

## Development Workflow

1. **Fork** the repository and create a branch from `main`.
2. Make your changes.
3. Run checks before submitting:

```sh
just check        # TypeScript type-check
just check-rust   # Cargo check
just clippy       # Rust linting
just test         # Frontend unit tests
just test-rust    # Rust tests
```

4. Open a **Pull Request** against `main`.

## Project Structure

| Directory | Purpose |
|---|---|
| `src/` | React frontend (components, hooks, types) |
| `src/components/` | UI components — one per file |
| `src/hooks/` | Custom React hooks (`use<Feature>.ts`) |
| `src/types/` | Shared TypeScript type definitions |
| `src/test/` | Unit tests (Vitest) |
| `src-tauri/` | Rust backend (Tauri commands, plugins) |

## Code Style

### TypeScript / React

- Functional components with hooks — no class components.
- Custom hooks go in `src/hooks/`, components in `src/components/`.
- Use `useCallback` for event handlers passed as props.
- All CSS lives in `src/App.css` using CSS custom properties.

### Rust

- Run `just fmt-rust` to format before committing.
- Run `just clippy` and fix all warnings.

## Testing

- **Unit tests are required** for all new or updated hooks, utility functions, and non-trivial logic.
- Tests live in `src/test/` and follow the naming convention `<module>.test.ts`.
- Mock external dependencies (Tauri plugins, pdfjs-dist) with `vi.mock()`.
- All tests must pass (`just test`) before a PR will be reviewed.

## Reporting Issues

- Use [GitHub Issues](https://github.com/omeryesil/awapi-pdf/issues) to report bugs or request features.
- Include steps to reproduce, expected behaviour, and your OS/version.

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Write a clear title and description of what changed and why.
- Reference any related issues (e.g. `Fixes #42`).
- Make sure all checks pass before requesting review.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
