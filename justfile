# AwapiPDF – Tauri + React + TypeScript

# Source Cargo environment so `cargo` is always on PATH
export PATH := env_var_or_default("HOME", "/root") + "/.cargo/bin:" + env_var_or_default("PATH", "")

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

# ── Release ──────────────────────────────────────────

# Bump version, commit, tag, and push to trigger the release CI
# Usage: just release 0.3.0
release version:
    #!/usr/bin/env bash
    set -euo pipefail
    if [[ -z "{{version}}" ]]; then
        echo "Usage: just release <version>  (e.g. just release 0.3.0)"
        exit 1
    fi
    echo "→ Bumping version to {{version}}"
    # Update package.json
    npm version "{{version}}" --no-git-tag-version
    # Update tauri.conf.json
    sed -i '' 's/"version": "[^"]*"/"version": "{{version}}"/' src-tauri/tauri.conf.json
    echo "→ Committing"
    git add package.json src-tauri/tauri.conf.json
    git commit -m "chore: bump version to {{version}}"
    echo "→ Tagging v{{version}}"
    git tag "v{{version}}"
    echo "→ Pushing"
    git push origin main
    git push origin "v{{version}}"
    echo "✓ Released v{{version}} — GitHub Actions will build the installers."

# ── Cleanup ──────────────────────────────────────────

# Remove build artifacts
clean:
    rm -rf dist
    cd src-tauri && cargo clean
