# AwapiPDF – Tauri + React + TypeScript

# List available recipes
default:
    @just --list

# ── Dev ──────────────────────────────────────────────

# Run the full Tauri app (frontend + backend)
dev:
    npm run tauri dev

# Run only the Vite frontend dev server
dev-web:
    npm run dev

# ── Build ────────────────────────────────────────────

# Build the Tauri app for production
build:
    npm run tauri build

# Build only the frontend
build-web:
    npm run build

# Preview the frontend production build
preview:
    npm run preview

# ── Test ─────────────────────────────────────────────

# Run all frontend tests
test:
    npm run test

# Run frontend tests in watch mode
test-watch:
    npm run test:watch

# Run Rust tests
test-rust:
    cd src-tauri && cargo test

# ── Lint & Format ────────────────────────────────────

# Type-check the frontend
check:
    npx tsc --noEmit

# Check Rust code
check-rust:
    cd src-tauri && cargo check

# Format Rust code
fmt-rust:
    cd src-tauri && cargo fmt

# Lint Rust code
clippy:
    cd src-tauri && cargo clippy -- -D warnings

# ── Dependencies ─────────────────────────────────────

# Install all dependencies (npm + cargo)
install:
    npm install
    cd src-tauri && cargo fetch

# Update npm dependencies
update:
    npm update

# Update Cargo dependencies
update-rust:
    cd src-tauri && cargo update

# ── Cleanup ──────────────────────────────────────────

# Remove build artifacts
clean:
    rm -rf dist
    cd src-tauri && cargo clean
