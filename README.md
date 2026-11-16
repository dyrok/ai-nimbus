# Nimbus Labs — Campus Helpdesk Agent (`campus-helpdesk`)

A deterministic, local-first AI helpdesk assistant built as a self-contained **Claude Code Plugin** (`campus-helpdesk`). It combines an open-standard **Agent Skill**, a **TypeScript stdio MCP Server**, a traversal-safe **`PreToolUse` Security Hook**, and a **Git Worktree** parallel development workflow—strictly grounded in synthetic campus mock fixtures.

---

## Architecture Overview

| Subsystem | Location | Role & Runtime Contract |
| :--- | :--- | :--- |
| **Plugin & Marketplace** | `.claude-plugin/marketplace.json`, `plugins/campus-helpdesk/` | Defines `nimbus-campus-marketplace` and self-contained `campus-helpdesk` plugin using `${CLAUDE_PLUGIN_ROOT}` for cache-isolated marketplace installs. |
| **Agent Skill & Command** | `plugins/campus-helpdesk/skills/timetable-helper/`, `commands/timetable.md` | 3-tier progressive-disclosure skill (`SKILL.md` YAML frontmatter with `name` + `description` only, `<500` line playbook, `references/`, `assets/timetable.csv`, and pure Python 3 stdlib `scripts/query_timetable.py`) plus `/campus-helpdesk:timetable`. |
| **Stdio MCP Server** | `mcp-server/` -> `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` | Built directly on `@modelcontextprotocol/sdk` (`^1.32.2`) and `zod` (`^4.0.0`), bundled via `esbuild` into a zero-dependency ESM artifact with synced `plugins/campus-helpdesk/data/hostel_rules.md`. Exposes `get_timetable`, `get_fee_status`, and `campus://hostel-rules` over `stdout` JSON-RPC 2.0 while logging strictly to `stderr`. |
| **Protected-Data Guard** | `plugins/campus-helpdesk/hooks/hooks.json`, `hooks/scripts/protect-data.sh` | `PreToolUse` (`Write\|Edit`) hook using Python 3 stdlib path canonicalization (`realpath` + `normpath`) and fail-closed JSON validation to block mutations to `data/protected/` (`permissionDecision: "deny"` on `exit 0`). |

---

## Strict Mock-Data-Only & Safety Policy

1. **100% Synthetic Data:** All student IDs (`STU-2026-001` through `STU-2026-005`), names, batches (`CSE-A`, `CSE-B`, `ECE-A`, `AI-DS-A`), schedules, rooms, fee ledgers, and hostel warden records are purely synthetic fixtures.
2. **Zero Real PII or Credentials:** Never store real student records, personal emails, phone numbers, passwords, or API tokens anywhere in the repository.
3. **Zero Outbound Network Requests:** Runtime scripts (`query_timetable.py`, `protect-data.sh`) and the MCP server execute locally with zero outbound HTTP/HTTPS calls.
4. **Zero-Fabrication Grounding:** Schedule, fee, and hostel rule answers trace strictly to verified CSV rows, MCP tool responses, or `campus://hostel-rules`. Unmatched batches/courses/IDs return explicit refusals without guessing.
5. **Cache-Safe Path Portability:** Plugin manifests and scripts rely exclusively on `${CLAUDE_PLUGIN_ROOT}` or script-relative path resolution—never hardcoded machine home paths.

---

## Verified Toolchain Baseline (`2026-11-17`)

- **Claude Code CLI:** `2.1.322 (Claude Code)`
- **Node.js / npm:** `v26.7.0` / `11.19.0`
- **Python:** `3.15.2` (standard library only; zero PyPI dependencies)
- **Git:** `2.55.0`
- **Typst:** `0.15.1` (technical report compilation)

---

## Repository Directory Structure

```text
ai-nimbus/
├── .claude-plugin/
│   └── marketplace.json                     # Root marketplace catalog (`nimbus-campus-marketplace` v1.0.0)
├── .gitignore
├── README.md
├── docs/                                    # Architecture, UX, strategy, design, PRD & checklist
├── evidence/                                # Captured Parts B–E logs & PNG screenshots
├── report/                                  # Typst report sources, compiled PDFs & Prompt Log
│   ├── Campus-Helpdesk-Toolchain-Report.pdf # Complete technical report (Parts A–F)
│   ├── Prompt-Log.pdf                       # Standalone chronological prompt log PDF
│   └── Prompt-Log.md                        # Standalone chronological prompt log Markdown
├── mcp-server/                              # TypeScript stdio MCP server source, data, bundler & tests
├── tests/                                   # Repo-level verification suites (15 skill + 22 hook tests)
└── plugins/
    └── campus-helpdesk/                     # Self-contained installable Claude Code plugin (v1.0.0)
        ├── .claude-plugin/
        │   └── plugin.json                  # Plugin manifest (`campus-helpdesk`)
        ├── .mcp.json                        # Stdio MCP wiring (`${CLAUDE_PLUGIN_ROOT}`)
        ├── README.md                        # Directory-profile plugin documentation & install guide
        ├── assets/
        │   └── icon.png                     # 512x512 plugin catalog icon
        ├── commands/                        # `/campus-helpdesk:timetable` slash command
        ├── skills/timetable-helper/         # Skill playbook, references, CSV fixture & Python script
        ├── hooks/                           # `PreToolUse` `Write|Edit` path-canonicalizing guard
        ├── data/                            # Synced `hostel_rules.md` & read-only `0444` `protected/` fixtures
        └── servers/                         # Bundled `campus-helpdesk-mcp.mjs` ESM executable
```

---

## Local Validation, Lifecycle & Test Commands

### 1. Marketplace & Plugin Schema Validation

```bash
claude plugin validate --strict .
claude plugin validate --strict ./plugins/campus-helpdesk
claude plugin validate --strict --profile directory ./plugins/campus-helpdesk
```

### 2. Local Marketplace Install & Inspection Lifecycle

```bash
claude plugin marketplace add ./
claude plugin marketplace list
claude plugin install campus-helpdesk@nimbus-campus-marketplace
claude plugin list
claude plugin details campus-helpdesk@nimbus-campus-marketplace

# Clean teardown
claude plugin uninstall campus-helpdesk@nimbus-campus-marketplace
claude plugin marketplace remove nimbus-campus-marketplace
```

### 3. Subsystem Build & Verification Suites (Phase 2+)

```bash
# Timetable skill deterministic unit tests (Python 3 stdlib)
python3 -m unittest discover -s tests/skill -v

# PreToolUse protected-data path traversal & fail-closed hook tests
bash tests/hooks/test_protect_data.sh

# TypeScript MCP server typecheck, esbuild bundle + data sync, and stdio protocol tests
npm --prefix mcp-server install
npm --prefix mcp-server run build
npm --prefix mcp-server test
```

### 4. Git Worktree Workflow Primitives

```bash
git worktree add -b feature/skill-tests .claude/worktrees/feature-skill-tests main
git worktree list
git merge --no-ff feature/skill-tests -m "Merge feature/skill-tests into main"
git worktree remove .claude/worktrees/feature-skill-tests
git worktree prune --verbose
```

---

## Architecture & Product Documentation

- [Technical Report PDF (Parts A–F)](report/Campus-Helpdesk-Toolchain-Report.pdf)
- [Prompt Log PDF](report/Prompt-Log.pdf) & [Prompt Log Markdown](report/Prompt-Log.md)
- [Master PRD & Delivery Roadmap](docs/prd_and_roadmap.md)
- [Technical Architecture](docs/tech_architecture.md)
- [Implementation Checklist & Release Gates](docs/implementation_checklist.md)
- [Design System](docs/design.md)
- [UX Research & Personas](docs/ux_and_personas.md)
- [Founders Strategy & Positioning](docs/founders_debate_and_strategy.md)
