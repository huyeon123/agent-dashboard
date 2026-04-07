# Agent Dashboard

A unified web dashboard for managing configuration and settings across multiple AI coding agents — Claude Code, Codex, Copilot, OpenCode, and more.

## Overview

Agent Dashboard provides a single control plane to view and manage:

- **Skills** — agent skill definitions and activation rules
- **Hooks** — lifecycle hooks (SessionStart, PreToolUse, PostToolUse, Stop, etc.)
- **Settings** — agent-specific configuration files
- **Permissions** — tool allow/deny rules
- **Capabilities** — supported features per agent
- **Plugins** — plugin registry and toggle
- **Rules** — custom instruction rules
- **Monitor** — real-time agent activity overview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| State | Zustand 5 |
| Backend | Vite middleware plugin (no separate server) |
| i18n | Korean / English |
| Markdown | react-markdown + remark-gfm |
| Build | Vite 8 + tsc |

## Project Structure

```
src/
├── features/          # Panel components (skills, hooks, settings, …)
├── components/        # Layout (Shell, Header, TabNav) and UI primitives
├── store/             # Zustand stores
├── hooks/             # Custom React hooks
├── i18n/              # Translation files (ko.json, en.json)
└── types/             # Shared TypeScript interfaces

server/
├── index.ts           # Vite middleware plugin + route dispatcher
├── agents/            # AgentAdapter, registry, types
└── routes/            # API handlers (one file per feature)

data/
├── agents.json        # Agent registry
└── projects.json      # Project registry
```

## Getting Started

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build (tsc + vite)
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## Architecture

**Middleware-based API** — The backend runs as a Vite plugin, eliminating the need for a separate Express/Node server during development and production preview.

**AgentAdapter pattern** — A single adapter class abstracts file I/O and config parsing for all supported agent types, keeping feature panels decoupled from agent-specific logic.

**Feature-first layout** — Each feature (skills, hooks, permissions, etc.) is a self-contained panel with its own types, API route, and i18n keys.

## Development Workflow

See [AGENTS.md](./AGENTS.md) for the full development guide, including API contract specs, QA checklist, i18n coverage requirements, and the multi-agent team workflow.
