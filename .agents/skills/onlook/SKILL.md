---
name: onlook
description: >-
  Visual code editing, DOM-to-code syncing, and integration workflows for Onlook (onlook-dev/onlook).
  Use this skill whenever the user asks to integrate, install, develop, run, self-host, or troubleshoot
  Onlook, or work with visual React, Next.js, and Tailwind CSS design-in-code workflows.
---

# Onlook Skill

Onlook ([github.com/onlook-dev/onlook](https://github.com/onlook-dev/onlook)) is an open-source visual-first design and code editor for **Next.js App Router** and **Tailwind CSS**. It enables visual editing directly on top of a running application's DOM, translating layout, styling, and text changes into clean React code and Tailwind CSS classes in real time.

---

## 1. Core Architecture & Concepts

Onlook bridges visual design and codebase editing using an AST (Abstract Syntax Tree) bi-directional sync loop:

1. **Preview Canvas (DOM Frame)**: Renders the user application inside a sandboxed iframe.
2. **Penpal RPC Bridge**: Connects the preview canvas with the visual editor shell to exchange DOM measurements, selected element metadata, and user interactions.
3. **AST Parser & Locator (`@onlook/parser`)**: Uses Babel/SWC and custom AST visitors to locate the exact source file, line number, column, and component node corresponding to any clicked DOM element.
4. **Code Provider (`@onlook/code-provider`)**: Applies visual modifications (Tailwind utility classes, styles, text edits, or JSX tree structure) directly into source code on disk.
5. **Hot Reload Sync**: As code updates on disk, the local development server (e.g. Next.js HMR) re-renders the preview instantly.

---

## 2. Onlook Monorepo & Development Workflow

When contributing to or developing the Onlook repository itself:

### Stack & Monorepo Layout
- **Runtime & Package Manager**: **Bun exclusively** (`bun@1.3.1`). Do NOT use `npm`, `yarn`, or `pnpm`.
- **Workspaces**:
  - `apps/web/client`: Next.js App Router + Tailwind CSS visual editor frontend.
  - `apps/backend`: Express/Node backend service.
  - `apps/admin`: Administration dashboard.
  - `packages/parser`: AST parsing, DOM element to code mapping, and JSX node manipulation.
  - `packages/code-provider`: File writing, code formatting, and local AST modifications.
  - `packages/db`: Drizzle ORM schema, migrations, and PostgreSQL client.
  - `packages/rpc`: Type-safe RPC between editor frontend and backend.
  - `packages/ui`: Shared design system components.
  - `packages/utility`: Shared helper functions and error handlers.

### Local Setup & Commands
```bash
# Clone the repository
git clone https://github.com/onlook-dev/onlook.git
cd onlook

# Install dependencies (must use bun)
bun install

# Run automated environment setup
bun run setup:env

# Database migrations & seed (Drizzle ORM)
bun run db:push
bun run db:seed

# Start the web client (localhost:3000)
bun run dev

# Run unit & workspace tests
bun run test

# Linting & formatting
bun run lint
bun run format
```

### Docker Self-Hosting
```bash
# Build and run containers in background
docker compose up -d

# View service logs
docker compose logs -f

# Stop containers
docker compose down
```

---

## 3. Integrating Onlook into a Next.js / Tailwind Project

To connect an existing Next.js + Tailwind project to Onlook:

### Key Requirements
1. **Next.js App Router**: Default to React Server Components (RSC). Add `'use client'` explicitly on interactive boundary components.
2. **Tailwind CSS**: Onlook detects and manipulates Tailwind utility classes.
3. **DOM Element Tagging**: Elements inspected by Onlook carry unique file-path and line-number identifiers (`data-onlook-id`) injected at build time via Babel or Webpack/Turbopack plugins.

---

## 4. Agent Guidelines & Coding Standards (AGENTS.md)

When modifying or generating code for Onlook or apps managed with Onlook:

- **Correctness First**: Keep diffs minimal, safe, and token-efficient. Avoid broad refactorings.
- **Client vs Server Boundaries**: Respect Next.js App Router boundaries. Keep server actions and data fetching on the server.
- **State Management**: Onlook uses `mobx-react-lite`'s `observer` for reactive canvas state. Any component using `observer` must carry `'use client'`.
- **API Architecture**: Routers live in `apps/web/client/src/server/api/routers/*` and must be exported from `root.ts`. Always validate inputs with Zod.
- **No Dev Server in Automation**: Do not run long-running `bun dev` processes inside automated test runners.

---

## 5. References & Documentation

Detailed documentation and guides are preserved in the `references/` directory:
- [AGENTS.md](./references/AGENTS.md): Full agent guidelines and rules.
- [CLAUDE.md](./references/CLAUDE.md): Repository commands and code style.
- [README.md](./references/README.md): Project overview and features.
- [Getting Started](./references/getting-started/): Onlook user and project guides.
- [Developer Architecture](./references/developers/architecture.mdx): Complete system architecture and edit-loop explanation.
- [Self-Hosting Guide](./references/self-hosting/): Single-machine and Docker deployment manuals.

