# Dependency resolution in mini-pnpm

This document describes the dependency resolution algorithm used in this learning project and discusses its limitations.

## Goal

Given:

- the desired top-level dependencies from `package.json` (including `dependencies` and `devDependencies`)
- an existing lockfile state (if available)

the algorithm computes the smallest practical set of changes needed to make the installed dependency graph match the desired state.

## Core idea

Instead of resolving everything from scratch every time, the algorithm:

1. compares desired top-level dependencies to lockfile top-level entries
2. computes a change set (add, remove, or replace version/type)
3. updates the dependency graph incrementally
4. applies those graph changes to disk

This keeps repeated installs faster.

## Algorithm steps

### 1) Build the target top-level set

Collect all requested top-level packages and their version ranges from `dependencies` and `devDependencies`.

### 2) Compare target vs lockfile

When a lockfile exists, classify each top-level package into one of these groups:

- **Add**: exists in target but not in lockfile top-level entries
- **Fix version**: exists in both, but lockfile version no longer satisfies requested range
- **Remove**: exists in lockfile top-level entries but no longer appears in target
- **Reclassify**: same package/version intent but moved between dependency types

If no lockfile exists, all target packages are treated as additions.

### 3) Process removals first

For each package selected for removal or replacement:

- mark it as a removal candidate
- include its transitive subtree as additional removal candidates
- keep any candidate that is still required by another surviving path
- if still needed transitively but no longer top-level, demote it from top-level without deleting it

This prevents accidental deletion of shared transitive dependencies.

### 4) Process additions/replacements

Use a queue-based traversal:

1. take a package request (name + range/tag)
2. fetch metadata and resolve to a concrete version
3. if that exact package/version already exists in graph, reuse it
4. otherwise create a node and enqueue its direct dependencies
5. mark top-level role where appropriate

Continue until the queue is empty.

### 5) Apply graph diff to installation state

From the computed diff:

- remove obsolete links/nodes
- download missing package contents
- verify integrity
- materialize links for new/updated packages
- write the new lockfile state


## Limitations 

This algorithm is intentionally simplified and does not aim to fully match production package managers.

- No peer dependency solving
- Limited conflict strategy: resolution focuses on direct requested ranges and transitive traversal, without advanced SAT-style global optimization. In practice, this means the resolver makes local decisions as it walks the graph instead of evaluating all constraints globally with backtracking. This can lead to less-than-optimal outcomes in complex trees (for example, extra duplicated versions or inability to find a globally best compromise among competing constraints).


