# Claude Code Guide

## Overview
MCP Playground is a browser-based debugging tool for Model Context Protocol (MCP) servers. Built with Hono + React + TypeScript.

## Key Principles
- **Minimalist design**: No UI frameworks, pure CSS. Dark theme with intentional spacing.
- **Type safety**: Full TypeScript, no `any` types unless unavoidable.
- **No over-engineering**: Keep it simple. Three similar lines of code is better than a premature abstraction.
- **Git workflow**: Conventional Commits, split by concern. See [COMMIT_CONVENTIONS.md](./.claude/COMMIT_CONVENTIONS.md).

## Project Structure
```
├── src/                    # Node.js backend (Hono)
│   ├── index.ts           # Server entry
│   ├── mcp-manager.ts     # MCP client lifecycle & logging
│   ├── routes.ts          # REST API endpoints
│   └── config.ts          # mcp-servers.json I/O
├── client/src/            # React + Vite frontend
│   ├── App.tsx            # App shell
│   ├── components/        # UI components
│   ├── styles.css         # All styling (no UI lib)
│   └── types.ts           # Shared TypeScript types
├── mcp-servers.json       # User config (gitignored)
└── mcp-servers.example.json # Config template (tracked)
```

## Development
```bash
npm install && npm --prefix client install
npm run dev      # Start server + client (port 8000 + 5173)
npm run dev:server
npm run dev:client
```

## Frontend Stack
- **React** 18 + TypeScript
- **Vite** for bundling
- **CSS**: Plus Jakarta Sans (sans) + JetBrains Mono (mono) from Google Fonts
- **No UI libraries** — all custom CSS using design tokens

## Backend Stack
- **Hono** on Node.js
- **@modelcontextprotocol/sdk** for MCP protocol
- **Transports**: stdio (subprocess), SSE, Streamable HTTP

## Design Tokens
All colors, fonts, spacing, and transitions are CSS variables in `client/src/styles.css`:
- `--bg-canvas`, `--bg-overlay`, `--text-1`, `--accent`, `--green`, `--red`, `--yellow`, `--purple`
- `--r` (6px), `--r-lg` (10px) for border radius
- `--t` (160ms cubic-bezier) for snappy transitions

## Features
- ✅ Connect to stdio, SSE, and Streamable HTTP MCP servers
- ✅ Browse tools, resources, and prompts
- ✅ Call tools with interactive form UI
- ✅ Real-time debug log terminal (JSON-RPC + stderr)
- ✅ Server config persistence in `mcp-servers.json`
- ✅ Dark minimalist UI with keyboard-friendly defaults

## Commit Conventions
See [COMMIT_CONVENTIONS.md](./.claude/COMMIT_CONVENTIONS.md) for details. Brief:
- `feat:` new feature
- `fix:` bug fix
- `style:` CSS/visual only (no logic)
- `chore:` config, docs, release prep
- `refactor:` code restructure (no behavior change)
- Split by concern. Keep messages brief.

## Code Style
- **No auto-format rules** — just keep it clean and readable
- **TypeScript**: Use proper types, avoid `any`
- **React**: Functional components, hooks. Keep them simple.
- **CSS**: Use variables. No nested/SCSS. Keep selector specificity low.

## Testing
Currently no automated tests. Manual testing:
1. Start dev server
2. Add a test MCP server (stdio or HTTP)
3. Verify connection, tool calls, resource reads, log output
4. Check mobile responsiveness (Vite dev tools)

## Deployment
```bash
npm run build   # Builds client to client/dist
npm start       # NODE_ENV=production, serves from port 8000
```

## Contributing
Issues and PRs welcome. Follow conventional commits and keep changes minimal. Don't add features beyond the request.

## License
MIT — See LICENSE file
