# Campus Helpdesk MCP Server (`campus-helpdesk-mcp`)

Local-first TypeScript **Model Context Protocol (MCP)** server speaking JSON-RPC 2.0 over `stdio` for the Nimbus Labs Campus Helpdesk plugin (`campus-helpdesk`).

## Package Verification Note

Before scaffolding this workspace, `@nimbus/mcp-skill-bridge` was checked directly against the npm registry via `npm view @nimbus/mcp-skill-bridge`, which returned `npm error code E404` (`404 Not Found`). Because `@nimbus/mcp-skill-bridge` does not exist, this server is built directly on the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) (`^1.32.2`) and [`zod`](https://zod.dev) (`^4.0.0`), and integrates natively with Claude Code via `plugins/campus-helpdesk/.mcp.json`.

## Exposed MCP Primitives (Read-Only, Synthetic Fixtures)

| Primitive | Name / URI | Schema / Type | Behavior |
| :--- | :--- | :--- | :--- |
| Tool | `get_timetable` | `z.object({ batch, day }).strict()` | Deterministic Fall-2026 IST lookup across `CSE-A`, `CSE-B`, `ECE-A`, `AI-DS-A`; returns empty `classes: []` on weekends; returns `isError: true` on unknown batch or invalid day token. |
| Tool | `get_fee_status` | `z.object({ student_id }).strict()` (`^STU-\d{4}-\d{3}$`) | Single-student Fall-2026 synthetic ledger lookup (`STU-2026-001`..`STU-2026-005`); returns `isError: true` (`STUDENT_NOT_FOUND`) for valid format absent from ledger; rejects malformed IDs with JSON-RPC `-32602`. |
| Resource | `campus://hostel-rules` | `text/markdown` | Reads `CAMPUS_DATA_DIR/hostel_rules.md` or relative `../data/hostel_rules.md`; throws `McpError(ErrorCode.InternalError)` (`-32603`) if unreadable. |

## Strict Stdout / Stderr Separation

`StdioServerTransport` owns `process.stdout` exclusively for newline-delimited JSON-RPC 2.0 messages. All diagnostic logs in `src/` are routed through `src/logger.ts` (`console.error` -> `process.stderr`). Zero `console.log`, `console.info`, `console.debug`, or `process.stdout.write` calls are permitted inside `mcp-server/src/`.

## Development & Build Commands

```bash
npm install          # Install @modelcontextprotocol/sdk, zod, and devDependencies
npm run typecheck    # Run strict TypeScript check (tsc --noEmit)
npm run build        # typecheck + tsc -> dist/index.js + esbuild plugin bundle & data sync
npm test             # Run unit & subprocess stdio wire tests via Node test runner + tsx
npm start            # Launch compiled stdio server from dist/index.js
```

Running `npm run build` executes `scripts/bundle-plugin.mjs` to emit a self-contained ESM bundle at `../plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` and sync `data/hostel_rules.md` to `../plugins/campus-helpdesk/data/hostel_rules.md`, ensuring marketplace cache installs run without `node_modules`.
