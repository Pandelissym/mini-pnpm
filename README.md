# mini-pnpm

![](https://img.shields.io/badge/Learning%20Project-FE7A16?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-3C873A?style=for-the-badge&logo=node.js&logoColor=white)
![Inspiration](https://img.shields.io/badge/inspired%20by-pnpm-black?style=for-the-badge)

A minimal package manager inspired by pnpm, built for learning.

`mini-pnpm` resolves package versions from the npm registry, verifies tarball integrity, stores package contents in a global content store, and links dependencies into a local virtual store.

## Features

- Install dependencies from `package.json`
- Add dependencies with semver ranges or tags
- Add dev dependencies with `-D` / `--save-dev`
- Remove dependencies from `package.json`
- Use a global store at `~/.mini-pnpm-store`
- Link packages into `node_modules/.pnpm` and top-level symlinks in `node_modules`
- Show store status and total store size

## Requirements

- Node.js 18+
- npm

## Install

### 1. Install dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

### 3. (Optional) Link CLI globally for local development

```bash
npm link
```

After linking, run commands with:

```bash
mini-pnpm <command>
```

If you do not link globally, run from source with:

```bash
npm run dev -- <command>
```

## CLI

### Global flags

- `-v`, `--version`: print version
- `-D`, `--save-dev`: add as dev dependency (for `add`)

### Commands

#### install

Install all dependencies and devDependencies from `package.json`.

```bash
mini-pnpm install
```

#### add

Add a package to dependencies.

```bash
mini-pnpm add react
mini-pnpm add react@18.3.1
mini-pnpm add lodash@^4.17.0
mini-pnpm add typescript -D
```

Notes:

- If no version is provided, `latest` is used with a `^` range.
- Package tarball integrity is verified before storing.

#### remove

Remove a package from `dependencies` and `devDependencies` in `package.json`.

```bash
mini-pnpm remove react
```

#### store status

Display packages in the global store and total size.

```bash
mini-pnpm store status
```

## How it works

1. Resolve package metadata from the npm registry.
2. Resolve the final version from a requested version range/tag.
3. Download and verify package tarball integrity.
4. Extract package contents to the global store (`~/.mini-pnpm-store`).
5. Hard-link package files into `node_modules/.pnpm/...`.
6. Create top-level symlinks in `node_modules/<package>`.

## Project scripts

```bash
npm run dev      # Run CLI via tsx
npm run build    # Compile TypeScript to dist/
npm test         # Placeholder (currently exits with error)
```

## Project structure

```text
bin/              # Executable entrypoint
src/              # Source code
src/commands/     # CLI command handlers
src/lib/          # Registry, store, linker, and utility logic
dist/             # Compiled output
```

## Notes

- This project is for educational purposes and does not implement the full pnpm feature set.
