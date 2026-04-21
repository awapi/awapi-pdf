# AwapiPDF

> Lightweight, smart, yours. — A modern PDF reader and writer powered by AI.

AwapiPDF is an open-source, cross-platform PDF reader and writer built by [Awapi](https://awapi.com). Born out of frustration with bloated, ad-ridden PDF tools like Adobe Acrobat, AwapiPDF is designed to be fast, minimal, and genuinely useful — with AI built in from the ground up.

No subscriptions. No ads. No 900 MB installs. Just a clean, powerful PDF tool that respects your time and your machine.

---

## Features

### Viewer
- PDF viewing with smooth zoom and scroll
- Page navigation and thumbnail sidebar
- Text selection and copy
- Full-text search across pages
- Dark and light themes
- Keyboard shortcuts

### Editor
- Annotations — highlight, sticky notes, freehand drawing
- Form filling (native PDF forms via PDF.js)
- Merge multiple PDFs into one
- Split a PDF into separate files
- Reorder pages within a document
- Create blank PDFs from scratch
- Digital signatures

### AI (coming soon)
- Chat with your document — ask questions, get answers
- Summarize long documents instantly
- Extract key dates, names, and data

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | [Tauri v2](https://v2.tauri.app) (Rust backend) |
| Frontend | [React 19](https://react.dev) + TypeScript |
| Build tool | [Vite](https://vite.dev) |
| PDF rendering | [PDF.js](https://mozilla.github.io/pdf.js/) |
| PDF manipulation | [pdf-lib](https://pdf-lib.js.org/) |
| Testing | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) |
| Task runner | [just](https://github.com/casey/just) |

---

## Installation

### macOS

Download the latest `.dmg` from the [Releases](https://github.com/awapi/awapi-pdf/releases) page, open it, and drag **AwapiPDF** to your Applications folder.

> **Note:** The app is currently unsigned. macOS may block it from opening. After moving it to Applications, run the following command in Terminal to remove the quarantine flag:
>
> ```sh
> xattr -cr /Applications/AwapiPDF.app
> ```
>
> Then open the app normally.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) (stable)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/)
- [just](https://github.com/casey/just) command runner

### Setup

```sh
git clone https://github.com/awapi/awapi-pdf.git
cd awapi-pdf
just install    # install npm + cargo dependencies
just dev        # run the app in development mode
```

### Common Commands

```sh
just dev          # Run full Tauri app (frontend + backend)
just test         # Run frontend unit tests
just check        # TypeScript type-check
just check-rust   # Cargo check
just clippy       # Rust linting
just build        # Production build
just clean        # Remove build artifacts
```

---

## Project Structure

```
src/                     # React frontend
  components/            # UI components (Toolbar, Sidebar, PdfViewer, etc.)
  hooks/                 # Custom React hooks (usePdfDocument, useSearch, etc.)
  types/                 # Shared TypeScript type definitions
  test/                  # Unit tests (Vitest)
src-tauri/               # Rust backend
  src/                   # Rust source (lib.rs, main.rs)
  capabilities/          # Tauri permission declarations
  tauri.conf.json        # Tauri app configuration
```

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on setting up the project, code style, testing requirements, and submitting pull requests.

---

## License

AwapiPDF is licensed under the **Apache License 2.0**. See [LICENSE](./LICENSE) for full terms.

---

## About Awapi

AwapiPDF is built and maintained by **Awapi**. We build lightweight, developer-friendly tools that get out of your way.