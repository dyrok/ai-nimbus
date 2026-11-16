# Nimbus Labs — Campus Helpdesk Agent: Master PRD & Phase-Wise Roadmap

> **Document Owner:** Product Manager & Release Gatekeeper (`product_manager_agent`)  
> **Product:** Nimbus Labs Campus Helpdesk Agent (`campus-helpdesk` Claude Code Plugin)  
> **Repository Root:** `/Users/ns/code/ai-nimbus`  
> **Version Trajectory:** `v0.1.0` (Baseline Skeleton) → `v0.2.0` (Worktree Integration) → `v1.0.0` (Release & Submission)  
> **Verification Baseline Date:** `2026-11-17`  
> **Status:** Authoritative PRD & Delivery Roadmap

---

## 1. Executive Summary & Synthesis Governance

The **Nimbus Labs Campus Helpdesk Agent** is a deterministic, local-first academic assistant distributed as a self-contained **Claude Code Plugin** (`campus-helpdesk`). It combines four open-standard primitives into one verifiable repository:

1. **Agent Skill (`skills/timetable-helper/SKILL.md` + `scripts/query_timetable.py`):** Procedural CSV interpretation, chronological schedule formatting, and zero-fabrication guardrails via 3-tier progressive disclosure.
2. **Stdio MCP Server (`mcp-server/` bundled to `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs`):** Typed, schema-validated campus tools (`get_timetable`, `get_fee_status`) and verbatim policy resource (`campus://hostel-rules`) over JSON-RPC 2.0 `stdio`.
3. **Deterministic `PreToolUse` Security Hook (`hooks/hooks.json` + `hooks/scripts/protect-data.sh`):** Out-of-context path-canonicalizing write blocker protecting `data/protected/` before disk mutation.
4. **Git Worktree Parallel Development & Release Verification:** Concurrent feature/bugfix isolation across sibling linked worktrees (`feature/skill-tests`, `feature/mcp-server`, `bugfix/hook-path`), human-reviewed conflict resolution, full marketplace lifecycle validation, and Typst-compiled academic deliverables.

### 1.1 Source Document Synthesis & Canonical Reconciliation

This PRD synthesizes `docs/design.md`, `docs/ux_and_personas.md`, `docs/founders_debate_and_strategy.md`, and `docs/tech_architecture.md`. Where early ideation drafts differed in concrete identifiers, the following canonical contract applies across all engineering phases:

| Topic | Early Draft Variants | Canonical Contract (Authoritative) |
| :--- | :--- | :--- |
| **Git Worktree Branches** | `feat/mcp-server`, `feat/skill-hooks`, `feat-exam-hall-mcp`, `fix-hook-path-norm` | **`feature/skill-tests`**, **`feature/mcp-server`**, **`bugfix/hook-path`** |
| **Worktree Directories** | `../nimbus-wt-*` | Sibling paths: `../ai-nimbus-wt-skill-tests`, `../ai-nimbus-wt-mcp-server`, `../ai-nimbus-wt-hook-path` |
| **MCP Resource URI** | `campus://hostel/rules` | **`campus://hostel-rules`** (served from `hostel_rules.md`) |
| **Fee Lookup Key** | `receipt_id` (`RCPT-MOCK-5081`) | **`student_id`** matching `^STU-\d{4}-\d{3}$` (e.g., `STU-2026-001`..`STU-2026-005`) |
| **Protected Data Paths** | `data/protected/timetable.csv`, `data/protected/fee_ledger.csv` | **`plugins/campus-helpdesk/data/protected/`** (`fee_ledger_master.json`, `academic_calendar_2026.csv`, `warden_escalation_roster.json`) |
| **PreToolUse Denial Mode** | Legacy `exit 2` + `stderr` | **Primary:** `exit 0` + JSON `hookSpecificOutput.permissionDecision: "deny"` on `stdout` (`exit 2` noted only as legacy fallback) |
| **Academic Batches** | `CSE-A`, `CSE-B`, `ECE-A` | **`CSE-A`**, **`CSE-B`**, **`ECE-A`**, **`AI-DS-A`** |

---

## 2. Master Product Requirements Document (PRD)

### 2.1 Problem Statement

University students, hostel wardens, and academic support staff lose time navigating fragmented timetable spreadsheets, checking term fee clearance, and locating exact hostel regulations. Naive LLM wrappers fail institutional reliability requirements in four concrete ways:

1. **Schedule & Policy Hallucination:** When a course code, batch, or policy clause is missing from source data, generic assistants invent plausible room numbers (`LH-404`, `CS999`) or paraphrase outdated rules from parametric memory.
2. **Protocol Corruption:** Local `stdio` MCP servers fail silently or break JSON-RPC framing whenever diagnostic logs or banners bleed onto `stdout`.
3. **Probabilistic Safety Leakage:** Relying purely on `SKILL.md` prompt instructions to guard sensitive directories leaves canonical campus records exposed to prompt injection, shell shortcuts, and `../` path traversal.
4. **Unverified AI Scaffolding:** LLM coding drafts routinely hallucinate nonexistent npm packages, config files, CLI commands, and specification dates unless audited against primary sources.

### 2.2 Product Goals & Objectives

| Goal ID | Objective | Measurable Success Target |
| :--- | :--- | :--- |
| **G-01** | **Zero-Fabrication Grounding** | `100%` of timetable, fee, and hostel rule outputs trace strictly to verified CSV rows, MCP tool outputs, or `campus://hostel-rules`; missing records trigger structured refusals with `0` guessed slots, rooms, or exceptions. |
| **G-02** | **Clean Primitive Separation** | Procedural CSV workflows reside in `timetable-helper` Skill; typed live state & verbatim rules reside in `stdio` MCP (`get_timetable`, `get_fee_status`, `campus://hostel-rules`); write protection resides in `PreToolUse` `protect-data.sh`. |
| **G-03** | **Protocol & Stream Purity** | `0` non-JSON-RPC bytes emitted on MCP `stdout`; diagnostics written exclusively to `stderr`; terminal tables fit `<= 96` columns (`6` columns max for timetables), respect `NO_COLOR`, and work under `--ax-screen-reader`. |
| **G-04** | **Self-Contained Plugin Portability** | `claude plugin validate --strict .`, `claude plugin validate --strict ./plugins/campus-helpdesk`, and `--profile directory` pass with `0` errors/warnings; plugin installs cleanly from marketplace cache via `${CLAUDE_PLUGIN_ROOT}` without parent `..` traversal or `node_modules` in cache. |
| **G-05** | **Worktree Concurrency & Merge Safety** | Three parallel streams develop cleanly in sibling Git worktrees, resolve a controlled `plugin.json` merge conflict via human review, pass Gates G1–G6, and clean up via `git worktree remove` + `git worktree prune`. |
| **G-06** | **Audit-Grade Academic Packaging** | Deliverables include Typst-compiled PDF Report (Parts A–F), standalone Prompt Log (`>= 5` verified AI-error detections), verified Source List (`2026-11-17`), real MCP Inspector/CLI captures, and clean validated `.zip` archive. |

### 2.3 Non-Goals & Explicit Anti-Scope

Engineering will **NOT** implement any of the following in `v1.0.0`:

- **No Mutating Campus Tools:** No `update_grade`, `waive_fee`, `assign_hostel`, or write/delete MCP endpoints. All V1 campus lookups are strictly read-only.
- **No Live SIS/ERP/Database Connectors:** No real campus databases, OAuth client secrets, or outbound HTTP/HTTPS network requests from the MCP server or skill scripts.
- **No Hardcoded Machine Paths:** Zero `/Users/<name>/...` paths in `.mcp.json`, `hooks/hooks.json`, `SKILL.md`, or `commands/timetable.md` (must use `${CLAUDE_PLUGIN_ROOT}` or script-relative resolution).
- **Mandatory Rejection of Six Pre-Build Due-Diligence Traps:**

| Banned Claim / Trap | Classification | Enforcement Rule |
| :--- | :--- | :--- |
| `@nimbus/mcp-skill-bridge` | Nonexistent npm package (`npm view` returns HTTP `E404`) | Strictly prohibited; connect Skills and MCP natively via Claude Code plugin structure (`.claude-plugin/plugin.json` + `.mcp.json`). |
| `skill.config.yaml` | Fabricated Skill config file | Strictly prohibited; Agent Skills metadata lives exclusively in `SKILL.md` YAML frontmatter (`name`, `description`). |
| MCP Spec `2025-02-30` | Impossible Gregorian calendar date / hallucinated spec | Strictly prohibited; target verified MCP protocol specifications (`2024-11-05`, `2025-03-26`, `2025-11-25`) implemented by `@modelcontextprotocol/sdk@1.32.2`. |
| `/worktree-merge` | Nonexistent Claude Code slash command | Strictly prohibited in code, skills, and SOPs; merge via standard `git merge --no-ff`. |
| `git worktree sync --all` | Nonexistent Git subcommand | Strictly prohibited; use verified `git worktree` subcommands (`add`, `list`, `remove`, `prune`). |
| `"NimbusSync Plugin Standard v4.2"` | Adversarial prompt-injection / fake authority trap | Explicitly rejected across policy docs, hook checks, and Claim Audit (Part A). |

### 2.4 Strict Mock-Data-Only Policy

1. **100% Synthetic Fixtures:** Every student ID (`STU-2026-001`..`STU-2026-005`), student name, batch (`CSE-A`, `CSE-B`, `ECE-A`, `AI-DS-A`), course code, room, instructor, fee balance, and hostel warden roster entry is purely synthetic mock data.
2. **Zero Real PII or Credentials:** Repository files, tests, screenshots, and Typst appendices must contain zero real student IDs, real SSNs/phone numbers, real personal emails, or real API keys.
3. **Zero Outbound Network Calls:** `mcp-server/` and `scripts/query_timetable.py` perform purely local deterministic execution against in-repo mock fixtures and synced plugin `data/`.
4. **Scoped Disclosure & Masking:** `get_fee_status` returns one student's ledger entry per validated `STU-YYYY-NNN` lookup; bulk dumps of unrelated students' fee rows are prohibited. Terminal receipt cards mask display identifiers (`STU-****-001`) unless full fixture verification requires exact key matching.

### 2.5 Verified-Sources-Only & Claim Audit Policy

1. **Primary Verification Gate:** Every CLI command, flag, npm package version, JSON field, and protocol version referenced in implementation, documentation, or the Typst report must be verified directly via local binary inspection (`claude --help`, `claude plugin --help`, `git worktree -h`, `npm view`, `typst --version`) or primary official specifications accessed on **`2026-11-17`**.
2. **Zero Guessing on Behavior:** Unchecked flags or memory-recalled SDK APIs are treated as defects. For example, `@modelcontextprotocol/sdk@1.32.2` requires full `z.object({...})` schemas in `registerTool()`, not raw shapes; `claude plugin validate` requires README `>= 40` words and marketplace install line for `--profile directory`; `hooks/hooks.json` uses the nested `hooks.PreToolUse[].hooks[]` wrapper.
3. **Claim Audit Deliverable:** Part A of the final report explicitly audits and refutes the 6 fabricated traps (`@nimbus/mcp-skill-bridge`, `skill.config.yaml`, `2025-02-30`, `/worktree-merge`, `git worktree sync --all`, `"NimbusSync Plugin Standard v4.2"`).

---

### 2.6 Target Personas & Core User Journeys

Synthesized from `docs/ux_and_personas.md` (using synthetic personas aligned to canonical schema fixtures):

| Persona | Mock Role & Profile | Primary Goals | Key Safety / Edge Triggers |
| :--- | :--- | :--- | :--- |
| **Aarav Kulkarni** | BTech CSE Student (`CSE-B`, `STU-2026-002` / mock student) | Check Tuesday/weekly classes under 10s; verify fee balance (`PARTIAL`); check hostel rules; optionally use `--ax-screen-reader` | Requests phantom course (`CS999`); omits batch; asks agent to "fix" `data/protected/` |
| **Meera Nair** | Senior Hostel Warden & Timetabling Audit Coordinator | Pull exact verbatim hostel rule sections (`campus://hostel-rules`); verify `data/protected/` immutability | Tests whether agent invents curfew grace periods or executes shell bypasses against `data/protected/` |
| **Rohan Deshmukh** | Nimbus Labs Maintainer | Develop skill tests, MCP server, and hook hardening concurrently via Git worktrees; run headless regression checks | Cross-branch contamination if paths aren't `${CLAUDE_PLUGIN_ROOT}`-relative; merge conflict in `plugin.json` |

#### Core End-to-End Journeys
- **Journey A — Timetable Query (`timetable-helper` Skill & `/campus-helpdesk:timetable`):** Runs deterministic `query_timetable.py` (or `get_timetable` MCP tool when `(batch, day)` provided), sorts chronologically in 24-hour IST (`HH:MM–HH:MM`), emits max-6-column Markdown table (`Time | Code | Course | Room | Instructor | Type`) with source footer, prompts cleanly on missing batch, and refuses unknown courses (`CS999`) or batches (`MECH-Z`) without fabricating slots.
- **Journey B — Fee Status Receipt (`get_fee_status` MCP Tool):** Validates `STU-YYYY-NNN`, emits receipt-style table with right-aligned currency (`INR`) and explicit text status badge (`[CLEARED]`, `[PARTIAL]`, `[DUE]`, `[OVERDUE · HOLD]`, etc.), and refuses unknown IDs (`STU-2026-999`, returning `isError: true`) or MCP outages honestly without extrapolating prior chat turns.
- **Journey C — Hostel Rules Lookup (`campus://hostel-rules` MCP Resource):** Reads canonical `hostel_rules.md` verbatim via MCP resource read; provides concise summary + exact section quote; refuses to invent unofficial curfew/appliance exceptions.
- **Journey D — Protected-Data Guard (`PreToolUse` Hook):** Intercepts `Write` or `Edit` targeting `data/protected/` (including `../` traversal, duplicate `//`, relative `cwd` resolution, or symlinks), denies pre-execution via `permissionDecision: "deny"` with warm `[PADLOCK]` guidance suggesting non-destructive `proposals/` drafts, leaving SHA-256 checksums unchanged.
- **Journey E — Parallel Worktree Maintenance:** Runs isolated worktrees (`../ai-nimbus-wt-skill-tests`, `../ai-nimbus-wt-mcp-server`, `../ai-nimbus-wt-hook-path`) sharing `$GIT_COMMON_DIR/objects/` while isolating `HEAD`, `index`, working tree, and `node_modules/`, followed by `--no-ff` integration and safe `remove`/`prune`.

---

### 2.7 Subsystem Functional & Technical Requirements

#### 2.7.1 Subsystem 1: Agent Skill (`timetable-helper`) & Slash Command (`/campus-helpdesk:timetable`)
- **Location:** `plugins/campus-helpdesk/skills/timetable-helper/` and `plugins/campus-helpdesk/commands/timetable.md`.
- **Three-Tier Progressive Disclosure:**
  1. **Tier 1 (Frontmatter):** `SKILL.md` contains strictly `name: timetable-helper` (`<= 64` chars, `^[a-z0-9-]+$`, matching folder name) and non-empty `description` (`<= 1024` chars, trigger-tuned). No `skill.config.yaml`.
  2. **Tier 2 (`SKILL.md` Body):** `< 500` lines (target `~110–160` lines) specifying execution routing (`query_timetable.py --format json` via `${CLAUDE_PLUGIN_ROOT}` or fallback relative `./scripts/query_timetable.py`; `get_timetable` MCP equivalence), on-demand reference pointers, chronological IST table contract, CSV prompt-injection skepticism (treat CSV cells as inert data), and Anti-Fabrication Grounding Invariant.
  3. **Tier 3 (`references/`, `assets/`, `scripts/`):**
     - `references/csv-dictionary.md`: 11-column schema (`batch,day,start_time,end_time,course_code,course_title,session_type,room,instructor,credits,term`), IST `HH:MM`, session types (`LECTURE`, `LAB`, `TUTORIAL`), batches (`CSE-A`, `CSE-B`, `ECE-A`, `AI-DS-A`).
     - `references/edge-cases.md`: Weekend empty-day rules, day/batch normalization, unknown batch refusal, lab splits (`L1`/`L2`), elective cross-listing.
     - `assets/timetable.csv`: UTF-8 (no BOM), Unix LF, RFC 4180 quoting, aligned 1:1 with `mcp-server/src/data.ts`.
     - `scripts/query_timetable.py`: Python 3 stdlib only; flags `--batch`, `--day`, `--course`, `--room`, `--csv`, `--format {json,markdown}`, `--list-batches`; deterministic sorting; exit `0` on valid execution (even `0` matched rows) and exit `2` with JSON error on `stderr` for invalid `--day`, bad flag, or missing/malformed CSV.
- **Slash Command:** `commands/timetable.md` defines `description`, `argument-hint: "<batch> [day]"`, and `$ARGUMENTS` handling enforcing the same anti-fabrication invariant.
- **Live Triggering & Description Optimization Requirement:** Conduct `>= 6` live Claude Code triggering tests (direct, indirect, multi-filter, ambiguous, weekend, and adversarial non-existent class `CS999` / unknown batch `MECH-Z`) plus `2` iterative `description` rewrites documenting recall/precision changes for Report Part B.

#### 2.7.2 Subsystem 2: TypeScript Stdio MCP Server (`mcp-server/` + Bundled Plugin Server)
- **Location:** Authoritative source in `mcp-server/`; bundled output in `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs`; synced policy data in `plugins/campus-helpdesk/data/hostel_rules.md`; plugin wiring in `plugins/campus-helpdesk/.mcp.json`.
- **Dependencies:** `@modelcontextprotocol/sdk@^1.32.2` (verified `1.32.2`), `zod@^4.0.0` (verified `4.6.7`), TypeScript (`NodeNext` ESM), `esbuild`, `tsx`, `@types/node`.
- **Tools (`tools/list`, `tools/call`):**
  1. `get_timetable`: `z.object({ batch, day })` -> normalizes batch/day, returns `isError: false` with chronologically sorted classes (or `classes: []` note on `Saturday`/`Sunday`), returns `isError: true` (`UNKNOWN_BATCH` / invalid day token) with `valid_batches`, and lets SDK reject missing/non-string types with JSON-RPC `-32602`.
  2. `get_fee_status`: `z.object({ student_id })` regex `^STU-\d{4}-\d{3}$/i` -> returns `isError: false` for known synthetic records (`STU-2026-001`..`STU-2026-005`), `isError: true` (`STUDENT_NOT_FOUND`) for syntactically valid unknown ID (`STU-2026-999`), and JSON-RPC `-32602` for malformed IDs (`"bad-id"`).
- **Resource (`resources/list`, `resources/read`):**
  - `campus://hostel-rules` (`name: "hostel-rules"`, `mimeType: "text/markdown"`) reading `CAMPUS_DATA_DIR/hostel_rules.md` or relative `../data/hostel_rules.md`; missing file throws `McpError(ErrorCode.InternalError, ...)` (`-32603`).
- **Stream Separation & Plugin Cache Isolation:**
  - `stdout` strictly carries newline-delimited JSON-RPC 2.0 frames; `console.log`/`console.info`/`console.debug`/`process.stdout.write` are banned in `mcp-server/src/`.
  - `src/logger.ts` writes structured diagnostics solely to `stderr` (`[ISO-TS] [nimbus:info|warn|err] ...`).
  - `scripts/bundle-plugin.mjs` uses `esbuild` (`bundle: true`, `platform: "node"`, `format: "esm"`, `target: "node20"`, CJS `createRequire` banner) to produce self-contained `campus-helpdesk-mcp.mjs` and syncs `hostel_rules.md` into `plugins/campus-helpdesk/data/` so cached marketplace installs require zero `node_modules` and zero `..` traversal.
- **MCP Inspector Verification:** Capture 3 canonical plates (`initialize`/`notifications/initialized`, `tools/list`+`tools/call`+`resources/read`, and error/refusal + `stderr` separation) and extract annotated `[REQ id=N]`/`[RES id=N]` JSON-RPC traces for Report Part D.

#### 2.7.3 Subsystem 3: Claude Code Plugin & Marketplace Packaging
- **Root Catalog:** `/Users/ns/code/ai-nimbus/.claude-plugin/marketplace.json` (`name: "nimbus-campus-marketplace"`, `plugins[0].source: "./plugins/campus-helpdesk"`, matching `name` and `version`).
- **Plugin Manifest:** `plugins/campus-helpdesk/.claude-plugin/plugin.json` (ONLY manifest inside `.claude-plugin/`; `skills/`, `commands/`, `hooks/`, `data/`, `servers/`, and `.mcp.json` sit at `plugins/campus-helpdesk/` root).
- **Plugin README:** `plugins/campus-helpdesk/README.md` with `>= 40` words and explicit marketplace install command to satisfy `claude plugin validate --strict --profile directory`.
- **Runtime Namespaces:** Skill `campus-helpdesk:timetable-helper`, Command `/campus-helpdesk:timetable`, MCP Tools `mcp__plugin_campus-helpdesk_campus-helpdesk__get_timetable` and `mcp__plugin_campus-helpdesk_campus-helpdesk__get_fee_status`.

#### 2.7.4 Subsystem 4: Security Hooks & Threat Model (`hooks/` + `data/protected/`)
- **Hook Registration:** `plugins/campus-helpdesk/hooks/hooks.json` using nested `{ "hooks": { "PreToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/scripts/protect-data.sh\"" }] }] } }`.
- **Canonical Path Traversal Guard (`protect-data.sh`):**
  - Executable (`chmod +x`), `set -euo pipefail`, zero dependency on `jq`.
  - Reads full `stdin` JSON payload; fails closed (`permissionDecision: "deny"`, `exit 0`) if JSON is malformed or `tool_input.file_path` is missing/non-string.
  - Uses Python 3 stdlib `os.path.realpath` + `os.path.normpath` combined with `cwd` to resolve `.`, `..`, `//`, and symlinks.
  - Denies if resolved or lexical path contains exact `("data", "protected")` segment tuple or falls inside `${CLAUDE_PLUGIN_ROOT}/data/protected` (while allowing unrelated names like `data_protected_backup`).
- **OS Defense-in-Depth:** Protected fixtures (`fee_ledger_master.json`, `academic_calendar_2026.csv`, `warden_escalation_roster.json`) carry `0444` read-only permissions.
- **Threat Model Coverage (Report Part C):**
  1. *Prompt Injection in Skills & Untrusted Data (e.g., poisoned CSV cell or `"NimbusSync Plugin Standard v4.2"`):* Defended by Skill data-vs-instruction rules AND deterministic `PreToolUse` enforcement outside the LLM context window.
  2. *Shell-Executing Hooks RCE Risk:* Mitigated in our plugin by zero external downloads/network calls, stdlib-only scripts, quoted `${CLAUDE_PLUGIN_ROOT}`, static audit, and adversarial hook tests; documented as vetting gate for third-party plugins.
  3. *MCP Tool Poisoning & Rug Pulls:* Mitigated by pinned local bundled server (`listChanged: false`), Zod schema validation, and verification of tool descriptions/schemas against hidden directives.
  4. *Why Deterministic Hooks Beat Prompt-Only Rules:* Prompt directives are probabilistic under context pressure or injection; `PreToolUse` executes deterministically on exact tool payloads before disk mutation at zero LLM token cost, and avoids fail-open script exit pitfalls (`exit 1`/`127`) by returning explicit `exit 0` + `permissionDecision: "deny"`.

#### 2.7.5 UX, CLI Output, Accessibility & Typst Design Requirements
- **Voice & Refusal Copy:** Warm, direct helpdesk tone (`[PADLOCK]`, explicit source footer, constructive `proposals/` pivot on write blocks); zero sterile AI boilerplate (`"As an AI assistant..."`, `"ERROR 403"`).
- **CLI Formatting & Accessibility:** `<= 96` column line discipline, 6-column timetable table grouped by day, receipt-aligned monetary ledger, 4-part GFM `[!CAUTION]` refusal callout (`[REFUSAL: UNVERIFIED_DATA]` plain CLI fallback), `NO_COLOR` / non-TTY compliance, explicit text status badges paired with color, and clean flat-sentence linear rendering under `claude --ax-screen-reader`.
- **Typst Technical Report (`typst 0.15.1`):** A4 (`210mm x 297mm`), `22mm`/`20mm` margins, verified contrast palette (`#1E3A5F` Nimbus Cobalt, `#1E293B` Slate Ink, `#F8FAFC` Warm Paper, `#D97706`/`#92400E`/`#FEF3C7` Amber, `#DC2626`/`#991B1B`/`#FEE2E2` Crimson, `#047857` Emerald, `#475569` Muted Slate, `#0F172A` Terminal Obsidian), `Libertinus Serif` / `Inter` / `DejaVu Sans Mono`, tabular lining numerals, borderless-vertical zebra audit tables, vector SVG/Mermaid topology (`<= 15` nodes, quoted labels), and normalized `100x32` terminal/Inspector evidence frames.

---

## 3. Master Acceptance Criteria & Verification Gates

Every release candidate must pass all technical gates (**G1–G6**), UX/adversarial checks (**UX-01–UX-11**, **ADV-01–ADV-06**), marketplace lifecycle checks (**L1–L8**), and submission packaging gates (**D1–D5**):

| Gate | Scope | Verification Command / Mechanism | Mandatory Pass Criterion |
| :--- | :--- | :--- | :--- |
| **G1** | Marketplace & Plugin Schema | `claude plugin validate --strict . && claude plugin validate --strict ./plugins/campus-helpdesk && claude plugin validate --strict --profile directory ./plugins/campus-helpdesk` | Exit `0`; zero errors and zero warnings; README `>= 40` words + install command present |
| **G2** | Skill Spec & Python Parser | Static check on `SKILL.md` (`< 500` lines, frontmatter only `name`+`description`, zero `skill.config.yaml`) + `python3 -m unittest discover -s tests/skill -v` + 6+ live triggering prompts & 2 `description` rewrites | All unit tests pass; valid queries exit `0`; bad day/CSV exit `2`; live triggering + anti-fabrication verified |
| **G3** | `PreToolUse` Data Protection | `bash tests/hooks/test_protect_data.sh` (direct, `../`, `//`, symlink, malformed JSON, safe path, `data_protected_backup`) + `0444` permission check | Protected/malformed inputs return `exit 0` + `permissionDecision: "deny"`; safe paths return `exit 0` with empty stdout |
| **G4** | MCP Typecheck, Bundle & Sync | `npm --prefix mcp-server run build` | `tsc --noEmit`, `tsc`, `esbuild` bundle (`campus-helpdesk-mcp.mjs`), and `hostel_rules.md` copy all succeed |
| **G5** | MCP Protocol & `stdout` Purity | `npm --prefix mcp-server test` + MCP Inspector CLI/UI verification | Zero non-JSON bytes on `stdout`; diagnostics strictly on `stderr`; `-32602` on bad schema; `isError: true` on unknown records; `campus://hostel-rules` returns markdown |
| **G6** | Git Worktree & Merge Hygiene | `git worktree list`, `git status`, `git log --graph --oneline --decorate --all`, conflict audit | Controlled `plugin.json` conflict resolved retaining both features; worktrees removed/pruned cleanly; only `main` remains |
| **UX/ADV** | Personas, Tone & Adversarial | Headless `claude -p --plugin-dir ./plugins/campus-helpdesk --output-format stream-json --include-hook-events --no-session-persistence --permission-prompts none` + `--ax-screen-reader` sample | Passes `UX-01`..`UX-11` and `ADV-01`..`ADV-06`; zero fabricated courses/rooms/rules; SHA-256 of `data/protected/*` unchanged |
| **L1–L8** | End-to-End Plugin Lifecycle | `marketplace add .` -> `install` -> `list` -> `details` -> live cached smoke check -> `uninstall` -> `marketplace remove` | All lifecycle commands succeed with captured logs/screenshots and clean host state after uninstall |
| **D1–D5** | Submission Deliverables | `typst compile` PDF (Parts A–F), standalone Prompt Log (`>= 5` caught AI errors), Source List (`2026-11-17`), clean `.zip` archive check (`unzip -tq` + validation of extracted copy) | PDF compiles cleanly without font/layout overflow; all required appendices & archive integrity checks pass |

---

## 4. Phase-Wise Delivery Roadmap

```mermaid
flowchart LR
    P1["Phase 1: Main Trunk Baseline (v0.1.0)"] --> P2["Phase 2: Parallel Worktrees (3 Streams)"]
    P2 --> P3["Phase 3: Integration, Conflict Resolution & Cleanup (v0.2.0 -> v1.0.0)"]
    P3 --> P4["Phase 4: Marketplace Lifecycle Verification (v1.0.0)"]
    P4 --> P5["Phase 5: Typst Report, Prompt Log & Zip Release"]
```

### Phase 1: Repository Baseline & `main` Trunk Initialization (`v0.1.0`)
- **Objective:** Establish a clean, valid `main` branch baseline before branching any parallel worktrees.
- **Deliverables:**
  - Initialize Git repo on `main` (if not already initialized).
  - Create root `.gitignore` excluding transient artifacts (`mcp-server/node_modules/`, `mcp-server/dist/`, `.DS_Store`, temporary test outputs, generated build artifacts while **explicitly allowing** tracked plugin runtime artifacts `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` and `plugins/campus-helpdesk/data/hostel_rules.md` for marketplace cache installs).
  - Create root `README.md` documenting architecture, mock-data policy, and developer quickstart.
  - Create `.claude-plugin/marketplace.json` (`nimbus-campus-marketplace`, `version: "0.1.0"`, pointing to `./plugins/campus-helpdesk`).
  - Create `plugins/campus-helpdesk/` `v0.1.0` skeleton: `.claude-plugin/plugin.json` (`version: "0.1.0"`) and `README.md` (`>= 40` words + marketplace install line).
  - Commit baseline (`docs/`, `.gitignore`, `README.md`, `.claude-plugin/marketplace.json`, `plugins/campus-helpdesk/` `v0.1.0` skeleton) cleanly on `main`.
- **Exit Gate:** `git status` clean on `main`; `claude plugin validate --strict .` and `claude plugin validate --strict --profile directory ./plugins/campus-helpdesk` pass on baseline skeleton.

### Phase 2: Parallel Worktree Development (`feature/skill-tests`, `feature/mcp-server`, `bugfix/hook-path`)
- **Objective:** Build all three subsystems concurrently in isolated sibling Git worktrees without cross-branch contamination, plus capture subsystem unit, live triggering, protocol, and adversarial evidence.
- **Provisioning Commands (executed from `main`):**
  ```bash
  git worktree add -b feature/skill-tests ../ai-nimbus-wt-skill-tests main
  git worktree add -b feature/mcp-server  ../ai-nimbus-wt-mcp-server  main
  git worktree add -b bugfix/hook-path    ../ai-nimbus-wt-hook-path    main
  git worktree list
  ```
- **Workstream A — `feature/skill-tests` (`../ai-nimbus-wt-skill-tests`):**
  - Implement `plugins/campus-helpdesk/skills/timetable-helper/` (`SKILL.md`, `references/csv-dictionary.md`, `references/edge-cases.md`, `assets/timetable.csv`, `scripts/query_timetable.py`) and `plugins/campus-helpdesk/commands/timetable.md`.
  - Implement `tests/skill/test_query_timetable.py` covering positive lookups, day/batch normalization, weekends, unknown batches (`MECH-Z`), `--course`/`--room`/`--list-batches`, and exit `2` invalid input handling.
  - Run live Claude Code triggering test suite (`6+` prompts including adversarial non-existent class `CS999` prompt) + execute `2` `SKILL.md` `description` rewrites, recording prompt inputs, trigger decisions, and outputs for Report Part B.
- **Workstream B — `feature/mcp-server` (`../ai-nimbus-wt-mcp-server`):**
  - Implement `mcp-server/` (`package.json`, `tsconfig.json`, `README.md`, `data/hostel_rules.md`, `scripts/bundle-plugin.mjs`, `src/index.ts`, `src/server.ts`, `src/data.ts`, `src/logger.ts`) using `@modelcontextprotocol/sdk@1.32.2` and `zod@^4.0.0` (`z.object()` schemas).
  - Ensure 1:1 timetable fixture parity with `assets/timetable.csv`, deterministic fee ledger (`STU-2026-001`..`STU-2026-005`), and `campus://hostel-rules` resource loading.
  - Implement `tests/tools-and-resources.test.ts` and `tests/stdio-protocol.test.ts` verifying `stdout` JSON-RPC purity, `stderr` diagnostics, `-32602` validation errors, and `isError: true` domain errors.
  - Build bundle (`plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs`) + sync `plugins/campus-helpdesk/data/hostel_rules.md`; add `plugins/campus-helpdesk/.mcp.json` using `${CLAUDE_PLUGIN_ROOT}`.
  - Update `plugins/campus-helpdesk/.claude-plugin/plugin.json` (`stdio-mcp` keyword + MCP description).
  - Run `@modelcontextprotocol/inspector` (`Web UI` + `--cli` / raw stdio capture) against the server and capture Captures A, B, and C + annotated JSON-RPC request/response pairs for Report Part D.
- **Workstream C — `bugfix/hook-path` (`../ai-nimbus-wt-hook-path`):**
  - Implement `plugins/campus-helpdesk/hooks/hooks.json` (`PreToolUse`, `"Write|Edit"`, `"\"${CLAUDE_PLUGIN_ROOT}/hooks/scripts/protect-data.sh\""`) and `plugins/campus-helpdesk/hooks/scripts/protect-data.sh` (Python 3 stdlib `realpath` + `normpath` traversal blocking, fail-closed JSON parse guard, `permissionDecision: "deny"` output).
  - Populate immutable mock fixtures in `plugins/campus-helpdesk/data/protected/` (`fee_ledger_master.json`, `academic_calendar_2026.csv`, `warden_escalation_roster.json`, set `chmod 0444`).
  - Implement `tests/hooks/test_protect_data.sh` testing direct paths, `../` traversal, `//` duplicate slashes, symlink redirection, malformed `stdin` fail-closed denial, safe workspace writes, and unrelated `data_protected_backup` pass-through.
  - Apply intentional conflicting edit to `plugins/campus-helpdesk/.claude-plugin/plugin.json` (`security-hooks` keyword + hook-hardening description) on the same JSON fields edited by `feature/mcp-server` to produce a controlled merge conflict in Phase 3.
- **Exit Gate:** Each worktree has clean committed history (`git status` clean) and passes its respective subsystem verification suite (G2 in `skill-tests`, G4+G5 in `mcp-server`, G3 in `hook-path`).

### Phase 3: Worktree Integration, Conflict Resolution & Safe Cleanup (`v0.2.0` → `v1.0.0`)
- **Objective:** Merge all three worktrees onto `main`, perform human-reviewed resolution of the controlled `plugin.json` conflict, validate all gates G1–G6 and headless UX/adversarial checks, bump version to `1.0.0`, and remove/prune worktrees cleanly.
- **Merge Sequence on `main`:**
  1. `git merge --no-ff feature/skill-tests -m "Merge feature/skill-tests into main"` (clean).
  2. `git merge --no-ff feature/mcp-server -m "Merge feature/mcp-server into main"` (clean).
  3. `git merge --no-ff bugfix/hook-path` (triggers controlled conflict in `plugins/campus-helpdesk/.claude-plugin/plugin.json`).
- **Conflict Resolution & Version Bump:**
  - Capture conflict markers/diff (`git status`, `git diff`) for Report Part E evidence.
  - Perform human-reviewed manual merge of `plugin.json` retaining **both** `stdio-mcp` and `security-hooks` keywords and unified description, ensuring valid JSON.
  - Verify cross-subsystem parity, bump `plugin.json`, `.claude-plugin/marketplace.json` (`metadata.version` and `plugins[0].version`), and `mcp-server/package.json` to `1.0.0` (staged with `v0.2.0` integration milestone -> `v1.0.0` release readiness).
  - Run full verification suite (Gates G1–G5 + headless Claude Code UX/ADV tests `UX-01`..`UX-11`, `ADV-01`..`ADV-06`, `--ax-screen-reader`, `--include-hook-events`) before/on completion.
- **Safe Cleanup:**
  - Remove worktrees via `git worktree remove` (never blind `rm -rf`), run `git worktree prune --verbose`, delete merged branches via `git branch -d`, and verify `git worktree list` + `git status` + `git log --graph --oneline --decorate --all` (Gate G6).

### Phase 4: End-to-End Plugin Lifecycle Verification (`v1.0.0`)
- **Objective:** Verify the full Claude Code marketplace installation, cache isolation, runtime operation, and clean teardown lifecycle and capture reproducible evidence/screenshots for Report Part C.
- **Verification Sequence:**
  1. `claude plugin validate --strict .`
  2. `claude plugin validate --strict ./plugins/campus-helpdesk`
  3. `claude plugin validate --strict --profile directory ./plugins/campus-helpdesk`
  4. `claude plugin marketplace add .` & `claude plugin marketplace list`
  5. `claude plugin install campus-helpdesk@nimbus-campus-marketplace`
  6. `claude plugin list`
  7. `claude plugin details campus-helpdesk@nimbus-campus-marketplace` (verify component inventory & token projection)
  8. Execute functional smoke test using the installed marketplace plugin (confirming `${CLAUDE_PLUGIN_ROOT}` resolves inside `~/.claude/plugins/cache/...`, Skill, `/campus-helpdesk:timetable`, MCP tools/resource, and `PreToolUse` write block all operate from cached install).
  9. `claude plugin uninstall campus-helpdesk@nimbus-campus-marketplace`
  10. `claude plugin marketplace remove nimbus-campus-marketplace` (confirm clean host restoration via `claude plugin list` and `claude plugin marketplace list`).

### Phase 5: Submission Deliverables Packaging (`v1.0.0` Final Release)
- **Objective:** Compile, verify, and package all academic/release submission artifacts cleanly without leaving transient clutter in the archive.
- **Deliverables:**
  1. **Typst PDF Technical Report (`typst compile` via Typst `0.15.1`):**
     - Follows `docs/design.md` styling (`tokens.typ`, A4, `#1E3A5F` Cobalt / `#F8FAFC` Warm Paper / `#1E293B` Slate Ink, tabular numerals, borderless-vertical audit tables, vector SVG/Mermaid figures, `100x32` evidence frames).
     - **Part A:** Architecture & Claim Audit (division of labor + 6 rejected fabricated traps).
     - **Part B:** Agent Skill Engineering, Triggering Tests (`6+` prompts incl. adversarial `CS999`) & `2` Description Experiments.
     - **Part C:** Plugin Packaging, Lifecycle Screenshots/Logs & Security Threat Model (prompt injection, shell hooks RCE, MCP tool poisoning, deterministic hooks vs prompt-only rules).
     - **Part D:** MCP Server, Inspector Screenshots/Logs (Captures A, B, C) & Annotated JSON-RPC Protocol Traces (`[REQ id=N]` / `[RES id=N]`).
     - **Part E:** Git Worktree Parallel Simulation, Internals (`$GIT_COMMON_DIR` vs per-worktree state), Conflict Diff/Resolution, Cleanup Logs (`remove`/`prune`/`git log --graph`), and Conceptual Q&A.
     - **Part F:** ~300-word Engineering Reflection, Prompt Log (`>= 5` verified AI-error detections), and Verified Source List (full URLs + access date **`2026-11-17`**).
  2. **Standalone Prompt Log:** Clean, inspectable log documenting prompts across design/build/debug phases and `>= 5` caught AI errors/hallucinations with exact corrections.
  3. **Clean Repository `.zip` Archive:** Built from clean tracked repo state + compiled report/prompt log deliverables (excluding `node_modules/`, `.DS_Store`, temp scratch files); verified with `unzip -tq` and extracted-directory validation (`claude plugin validate --strict` + unit tests).

---

## 5. Verified Primary Sources Baseline (Accessed `2026-11-17`)

All URLs and toolchain versions below were directly verified against primary sources and local binaries as of `2026-11-17`:

| Category | Verified Reference / Tool | URL / Verification Source | Access / Check Date |
| :--- | :--- | :--- | :--- |
| **Claude Code Plugins** | Claude Code Plugins Guide & CLI (`2.1.322`) | `https://code.claude.com/docs/en/plugins` | `2026-11-17` |
| **Claude Code Skills** | Claude Code Skills Documentation | `https://code.claude.com/docs/en/skills` | `2026-11-17` |
| **Claude Code Hooks** | Claude Code Hooks Reference (`PreToolUse`) | `https://code.claude.com/docs/en/hooks` | `2026-11-17` |
| **Agent Skills Spec** | Agent Skills Open Specification | `https://agentskills.io/specification` | `2026-11-17` |
| **Marketplace Schema** | Claude Code Marketplace JSON Schema | `https://json.schemastore.org/claude-code-marketplace.json` | `2026-11-17` |
| **MCP Specification** | Model Context Protocol Specification & `stdio` | `https://modelcontextprotocol.io/specification` | `2026-11-17` |
| **MCP TypeScript SDK** | `@modelcontextprotocol/sdk@1.32.2` | `https://github.com/modelcontextprotocol/typescript-sdk.git` (`https://modelcontextprotocol.io`) | `2026-11-17` |
| **MCP Inspector** | `@modelcontextprotocol/inspector@2.15.0` | `https://github.com/modelcontextprotocol/inspector#readme` | `2026-11-17` |
| **Zod Schema Library** | `zod@4.6.7` | `https://zod.dev` | `2026-11-17` |
| **Git Worktrees** | `git-worktree` Manual (`git 2.55.0`) | `https://git-scm.com/docs/git-worktree` | `2026-11-17` |
| **Typst Reference** | Typst Documentation (`typst 0.15.1`) | `https://typst.app/docs/reference/` | `2026-11-17` |
