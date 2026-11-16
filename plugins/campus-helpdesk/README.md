# Campus Helpdesk (`campus-helpdesk`)

The **Nimbus Labs Campus Helpdesk** plugin equips Claude Code with deterministic, zero-fabrication academic and hostel workflows backed exclusively by local synthetic campus fixtures. It bundles the `timetable-helper` Agent Skill and `/campus-helpdesk:timetable` command for chronological IST class lookups, a self-contained `campus-helpdesk-mcp` stdio MCP server (`get_timetable`, `get_fee_status`, and the `campus://hostel-rules` markdown resource), and a traversal-safe `PreToolUse` security hook protecting read-only records under `data/protected/`.

## Installation

Install from the Nimbus Campus marketplace inside Claude Code:

```text
/plugin install campus-helpdesk@nimbus-campus-marketplace
```

Or install directly via the directory marketplace command:

```text
/plugin install campus-helpdesk --marketplace nimbus-labs/ai-nimbus
```

For local repository verification from a clone of `ai-nimbus`:

```bash
claude plugin marketplace add .
claude plugin install campus-helpdesk@nimbus-campus-marketplace
```

## Components

- **Skill (`timetable-helper`) & Command (`/campus-helpdesk:timetable`):** Progressive-disclosure skill and deterministic Python 3 stdlib query script for `CSE-A`, `CSE-B`, `ECE-A`, and `AI-DS-A` class schedules.
- **MCP Server (`campus-helpdesk-mcp`):** Self-contained ESM bundle over JSON-RPC 2.0 `stdio` (`stdout` protocol-pure, diagnostics strictly on `stderr`).
- **Protected-Data Guard (`PreToolUse`):** Blocks `Write` and `Edit` tool calls targeting `data/protected/` before disk mutation while guiding safe drafts to `proposals/`.
