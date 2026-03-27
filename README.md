# mini-pnpm

![](https://img.shields.io/badge/Learning%20Project-FE7A16?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-6.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-3C873A?style=for-the-badge&logo=node.js&logoColor=white)
![Inspiration](https://img.shields.io/badge/inspired%20by-pnpm-black?style=for-the-badge)

A minimal package manager inspired by pnpm, built for learning.

`mini-pnpm` resolves package versions from the npm registry, verifies tarball integrity, stores package contents in a global content store, and links dependencies into a local virtual store. It writes a **YAML lockfile** (`mini-pnpm-lock.yaml`) so installs are reproducible and the full resolution graph (including transitive dependencies, integrity, and tarball URLs) is recorded.

## Features

- Install dependencies from `package.json`
- Add dependencies with semver ranges or tags
- Add dev dependencies with `-D` / `--save-dev`
- Remove dependencies from `package.json`
- Lockfile (`mini-pnpm-lock.yaml`): pins the resolved graph, top-level `dependencies` / `devDependencies` versions, and detects when `package.json` is out of sync
- Use a global store at `~/.mini-pnpm-store`
- Link packages into `node_modules/.pnpm`, top-level symlinks in `node_modules`, and executable symlinks in `node_modules/.bin` when packages declare `bin`
- Show store status and total store size
- In-memory metadata cache during a single resolve to avoid duplicate registry fetches for the same package name

### Planned features

- [ ] Stronger security around tarball download
- [ ] Richer default help / command-specific help (current `help` output is minimal)
- [ ] Workspaces support
- [ ] Parallel tarball downloads
- [ ] Run scripts (`mini-pnpm run …`)
- [ ] Benchmark
- [ ] Optional dependencies
- [ ] Peer dependencies

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
- `--log-level <level>`: one of `debug`, `info`, `warn`, `error` (default: `info`)

### Commands

#### install

Install all dependencies and devDependencies from `package.json`, reconcile with the lockfile, download missing packages, and refresh `mini-pnpm-lock.yaml`.

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

Remove a package from `dependencies` and `devDependencies` in `package.json`, then reconcile the lockfile and `node_modules`.

```bash
mini-pnpm remove react
```

#### store status

Display packages in the global store and total size.

```bash
mini-pnpm store status
```

## How it works

1. Read `package.json` (and `mini-pnpm-lock.yaml` when present).
2. Compare top-level dependency ranges with the lockfile; resolve any mismatches or missing entries against the npm registry.
3. Walk the dependency graph (with metadata cached per package name during the run).
4. Download tarballs, verify integrity, and extract into the global store (`~/.mini-pnpm-store`).
5. Hard-link package files into `node_modules/.pnpm/...`.
6. Create top-level symlinks in `node_modules/<package>` and bin shims in `node_modules/.bin` where applicable.
7. Write an updated `mini-pnpm-lock.yaml`.

## Project scripts

```bash
npm run dev         # Run CLI via tsx
npm run build       # Compile TypeScript to dist/
npm run type-check  # tsc --noEmit
npm run format      # Biome check --fix
npm test            # Run tests (Vitest)
```

## Notes

- This project is for educational purposes and does not implement the full pnpm feature set.
