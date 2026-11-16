# Nimbus Labs — Campus Helpdesk Agent: Implementation Checklist & Release Gates

> **Document Owner:** Product Manager & Release Gatekeeper (`product_manager_agent`)  
> **Repository Root:** `/Users/ns/code/ai-nimbus`  
> **Verification Baseline Date:** `2026-11-17`  
> **Rule:** Every unimplemented item MUST remain `- [ ]` until implemented, executed, and verified against its explicit build/test gate command. Never pre-check items.

---

## Version Bump Milestones

| Milestone | Target Version | Entry Trigger | Mandatory Gate Before Tagging / Bump |
| :--- | :--- | :--- | :--- |
| **M1 — Baseline Skeleton** | `v0.1.0` | Phase 1 complete | Clean `main` commit; `claude plugin validate --strict .` & `--strict --profile directory ./plugins/campus-helpdesk` pass |
| **M2 — Worktree Integration** | `v0.2.0` | Phase 3 merge complete | All 3 branches merged (`--no-ff`); `plugin.json` conflict human-resolved; Gates **G1–G6** green |
| **M3 — Release & Submission** | `v1.0.0` | Phase 3–5 verified | Version synchronized across `plugin.json`, `marketplace.json`, and `mcp-server/package.json`; full Phase 4 lifecycle + Phase 5 PDF/Prompt Log/Zip gates pass |

---

## Global Policy Invariants (Verify Continuously)

- [x] Verify zero banned/fabricated artifacts exist anywhere in repository (`@nimbus/mcp-skill-bridge`, `skill.config.yaml`, `2025-02-30`, `/worktree-merge`, `git worktree sync`, `NimbusSync`) via `grep -rnE --exclude-dir=node_modules --exclude-dir=docs "@nimbus/mcp-skill-bridge|skill\.config\.yaml|2025-02-30|/worktree-merge|worktree sync|NimbusSync" .` (expecting exit `1` / zero matches).
- [ ] Verify strict Mock-Data-Only compliance: zero real student PII, zero real campus credentials/domains, and zero outbound `http://`/`https://` requests in runtime code (`mcp-server/src/`, `plugins/campus-helpdesk/`).
- [x] Verify zero hardcoded local machine paths (`/Users/`) exist inside `plugins/campus-helpdesk/` configs or scripts (`${CLAUDE_PLUGIN_ROOT}` or script-relative resolution only).

---

## Phase 1: Repository Baseline & `main` Trunk Initialization (`v0.1.0`)

**Phase 1 Release Gate:** `git status` clean on `main`, `claude plugin validate --strict .` exit `0`, `claude plugin validate --strict ./plugins/campus-helpdesk` exit `0`, `claude plugin validate --strict --profile directory ./plugins/campus-helpdesk` exit `0`.

- [x] **1.1 Git Initialization & Branch Alignment**
  - Initialize Git repository on `main` (`git init -b main` if `.git` does not yet exist) and confirm `git branch --show-current` outputs `main`.
  - **Gate:** `git rev-parse --is-inside-work-tree` returns `true` and current branch is `main`.
- [x] **1.2 Root `.gitignore`**
  - Create `/Users/ns/code/ai-nimbus/.gitignore` excluding `mcp-server/node_modules/`, `mcp-server/dist/`, `.DS_Store`, `*.log`, temporary Inspector/PDF scratch directories, while ensuring `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` and `plugins/campus-helpdesk/data/hostel_rules.md` are **not** ignored so plugin cache installs are self-contained.
  - **Gate:** `git check-ignore mcp-server/node_modules mcp-server/dist .DS_Store` matches ignored entries; `git check-ignore plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs plugins/campus-helpdesk/data/hostel_rules.md` returns non-zero (not ignored).
- [x] **1.3 Root `README.md`**
  - Create `/Users/ns/code/ai-nimbus/README.md` summarizing architecture, strict mock-data-only policy, verified toolchain baseline, directory layout, and developer/testing commands.
  - **Gate:** Manual review confirms zero fabricated commands (`git worktree sync`, `/worktree-merge`) or banned packages.
- [x] **1.4 Root Marketplace Catalog (`.claude-plugin/marketplace.json`)**
  - Create `/Users/ns/code/ai-nimbus/.claude-plugin/marketplace.json` with `"$schema": "https://json.schemastore.org/claude-code-marketplace.json"`, `"name": "nimbus-campus-marketplace"`, `metadata.version: "0.1.0"`, and plugin entry `"name": "campus-helpdesk"`, `"source": "./plugins/campus-helpdesk"`, `"version": "0.1.0"`.
  - **Gate:** `python3 -m json.tool .claude-plugin/marketplace.json > /dev/null` exits `0` and `claude plugin validate --strict .` exits `0`.
- [x] **1.5 Plugin `v0.1.0` Skeleton (`plugins/campus-helpdesk/`)**
  - Create `plugins/campus-helpdesk/.claude-plugin/plugin.json` (`name: "campus-helpdesk"`, `version: "0.1.0"`, `description`, `author`, `license`, `keywords`).
  - Create `plugins/campus-helpdesk/README.md` with `>= 40` words and explicit marketplace install line (`/plugin install campus-helpdesk --marketplace ...`).
  - **Gate:** `claude plugin validate --strict ./plugins/campus-helpdesk` and `claude plugin validate --strict --profile directory ./plugins/campus-helpdesk` both exit `0` with zero errors/warnings.
- [x] **1.6 Baseline Commit on `main` (`v0.1.0`)**
  - Stage and commit `.gitignore`, `README.md`, `.claude-plugin/marketplace.json`, `plugins/campus-helpdesk/` skeleton, and `docs/` onto `main` as clean baseline commit (`git tag v0.1.0` optional/annotated after check).
  - **Gate:** `git status --short` outputs empty on `main`; `git log -1 --oneline` shows baseline commit.

---

## Phase 2: Parallel Worktree Development (`feature/skill-tests`, `feature/mcp-server`, `bugfix/hook-path`)

*(Execution Note: Per `code.claude.com/docs/en/worktrees`, linked worktrees were provisioned under `.claude/worktrees/<branch>` rather than external `../ai-nimbus-wt-*` paths, keeping all parallel checkouts cleanly inside the repo `.gitignore` boundary.)*

### 2.0 Linked Worktree Provisioning (Execute from Clean `main`)

- [x] **2.0.1 Create Sibling Linked Worktrees**
  - Provisioned three isolated linked worktrees from `main` (`2bfd15d`):
    - `git worktree add -b feature/skill-tests .claude/worktrees/feature-skill-tests main`
    - `git worktree add -b feature/mcp-server .claude/worktrees/feature-mcp-server main`
    - `git worktree add -b bugfix/hook-path .claude/worktrees/bugfix-hook-path main`
  - **Gate:** `git worktree list` printed all 4 entries (`evidence/logs/worktree-setup.log`).

---

### 2.1 Workstream A — `feature/skill-tests` (`.claude/worktrees/feature-skill-tests`)

**Workstream A Gate (G2 + Live Triggering):** Static `SKILL.md` checks pass (`55` lines, zero `skill.config.yaml`), `python3 -B -m unittest discover -s tests/skill -v` (`15/15`) passes 100%, and `6` live Claude Code triggering tests + `2` `description` rewrite experiments (isolated & full-plugin) are logged.

- [x] **2.1.1 Skill Definition (`plugins/campus-helpdesk/skills/timetable-helper/SKILL.md`)**
  - Authored `SKILL.md` (`55` lines, strictly `< 500`) with YAML frontmatter containing **only** `name: timetable-helper` and `description` (267 chars), Tier 2 routing (`query_timetable.py` + `get_timetable` MCP equivalence), Tier 3 reference pointers, CSV prompt-injection hygiene, and Anti-Fabrication Grounding Invariant. Confirmed zero `skill.config.yaml`.
  - **Gate:** `wc -l` (`55 < 500`), `15/15` packaging tests, and `claude plugin validate --strict` pass.
- [x] **2.1.2 Tier 3 References (`references/csv-dictionary.md`, `references/edge-cases.md`)**
  - Authored `references/csv-dictionary.md` (41 lines) and `references/edge-cases.md` (51 lines) matching canonical CSV columns and edge rules.
  - **Gate:** Files exist and pass unit/packaging validation.
- [x] **2.1.3 Canonical CSV Fixture (`assets/timetable.csv`)**
  - Authored 27 synthetic Fall-2026 rows across `CSE-A`, `CSE-B`, `ECE-A`, `AI-DS-A` in UTF-8 without BOM and Unix LF.
  - **Gate:** Validated by `CanonicalCsvFixtureTests` in `unittest`.
- [x] **2.1.4 Deterministic Python Stdlib Query Script (`scripts/query_timetable.py`)**
  - Implemented 408-line Python 3 stdlib query script supporting `--batch`, `--day`, `--course`, `--room`, `--csv`, `--format {json,markdown}`, `--list-batches`, chronological IST sorting, exit `0` on valid queries/`0` matches, and exit `2` JSON error on `stderr`.
  - **Gate:** Verified across CLI unit tests (`15/15`).
- [x] **2.1.5 Slash Command (`plugins/campus-helpdesk/commands/timetable.md`)**
  - Authored `/campus-helpdesk:timetable` command enforcing anti-fabrication and `${CLAUDE_PLUGIN_ROOT}` script invocation.
  - **Gate:** `claude plugin validate --strict ./plugins/campus-helpdesk` exits `0`.
- [x] **2.1.6 Python Unit Tests (`tests/skill/test_query_timetable.py`)**
  - **Gate:** `python3 -B -m unittest discover -s tests/skill -v` ran `15` tests -> `OK`.
- [x] **2.1.7 Live Claude Code Triggering Tests (6+ Prompts) & 2 `description` Rewrites**
  - Executed `6` live `claude -p` prompts (`P1`–`P6` including adversarial `CS999`) across `V0_baseline`, `V1_too_narrow`, and `V2_too_broad` in both full-plugin (`evidence/logs/skill-trigger-results.json`) and isolated skill (`evidence/logs/skill-trigger-isolated.json`) modes.
  - **Gate:** Transcripts/logs saved with verified non-fabrication on `CS999` and clear isolated recall (`V1: 0/6`) vs precision (`V2: P4 false positive`) deltas.
- [x] **2.1.8 Commit `feature/skill-tests` Cleanly**
  - **Gate:** Committed `4ce4420` cleanly on `feature/skill-tests`.

---

### 2.2 Workstream B — `feature/mcp-server` (`.claude/worktrees/feature-mcp-server`)

**Workstream B Gate (G4 + G5 + Inspector):** `npm run build` and `npm test` (`10/10`) pass 100%, `stdout` has zero non-JSON bytes, and MCP Inspector CLI + 4 Web UI screenshots + raw JSON-RPC pairs are recorded.

- [x] **2.2.1 Package & TypeScript Configuration (`mcp-server/package.json`, `tsconfig.json`, `README.md`)**
  - Configured ESM package (`@modelcontextprotocol/sdk@^1.32.2`, `zod@^4.0.0`); documented `npm view @nimbus/mcp-skill-bridge` `E404` rejection in `README.md`.
  - **Gate:** `npm --prefix mcp-server run build` and `test` pass without `@nimbus/mcp-skill-bridge`.
- [x] **2.2.2 Mock Campus Data & Canonical Hostel Rules (`mcp-server/src/data.ts`, `mcp-server/data/hostel_rules.md`)**
  - Aligned 27 Fall-2026 rows 1:1 with `assets/timetable.csv`, synthetic ledger `STU-2026-001`..`005`, and 6-section `hostel_rules.md`.
  - **Gate:** Verified in `tools-and-resources.test.ts` (`canonical timetable dataset contains all 27 synthetic rows`).
- [x] **2.2.3 Stderr-Only Logger & MCP Server Implementation (`src/logger.ts`, `src/server.ts`, `src/index.ts`)**
  - **Gate:** Zero `stdout` logger calls (`src/logger.ts` uses `console.error` only); `tsc --noEmit` exits `0`.
- [x] **2.2.4 Dual-Output Bundle & Sync Script (`mcp-server/scripts/bundle-plugin.mjs`)**
  - **Gate:** Emitted `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` (`1.3mb`) and synced `plugins/campus-helpdesk/data/hostel_rules.md` cleanly.
- [x] **2.2.5 Plugin MCP Config (`plugins/campus-helpdesk/.mcp.json`)**
  - **Gate:** Uses `${CLAUDE_PLUGIN_ROOT}` and passes `claude plugin validate --strict`.
- [x] **2.2.6 MCP Unit & Subprocess Stdio Protocol Tests (`mcp-server/tests/*.test.ts`)**
  - **Gate:** `npm --prefix mcp-server test` ran `10` tests -> `10 passed, 0 failed, 0 skipped`.
- [x] **2.2.7 MCP Inspector Captures & JSON-RPC Trace Artifacts**
  - **Gate:** Saved `@modelcontextprotocol/inspector@2.15.0` `--cli --strict` (`evidence/logs/mcp-inspector-cli.log`), raw wire exchange (`mcp-raw-jsonrpc.log` + live stdio verification), and 4 Chromium Web UI screenshots (`evidence/screenshots/part-d-inspector-*.png`).
- [x] **2.2.8 Branch Metadata Edit & Clean Commit (`feature/mcp-server`)**
  - **Gate:** Committed `0850d9e` cleanly on `feature/mcp-server` with `"stdio-mcp"` keyword edit in `plugin.json`.

---

### 2.3 Workstream C — `bugfix/hook-path` (`.claude/worktrees/bugfix-hook-path`)

**Workstream C Gate (G3 + Conflict Setup):** Adversarial hook test script passes `22/22` checks, `data/protected/*` permissions are `0444`, and `plugin.json` carries the conflicting edit.

- [x] **2.3.1 Hook Declaration (`plugins/campus-helpdesk/hooks/hooks.json`)**
  - **Gate:** Validated cleanly via `claude plugin validate --strict`.
- [x] **2.3.2 Protected-Data Guard Script (`plugins/campus-helpdesk/hooks/scripts/protect-data.sh`)**
  - **Gate:** Executable (`chmod +x`), fail-closed JSON validation + Python 3 `realpath`/`normpath` traversal/symlink guard returning JSON `permissionDecision: "deny"` on `exit 0`.
- [x] **2.3.3 Immutable Protected Mock Fixtures (`plugins/campus-helpdesk/data/protected/`)**
  - **Gate:** `fee_ledger_master.json`, `academic_calendar_2026.csv`, and `warden_escalation_roster.json` verified `0444` (`-r--r--r--`).
- [x] **2.3.4 Adversarial Hook Test Suite (`tests/hooks/test_protect_data.sh`)**
  - **Gate:** `bash tests/hooks/test_protect_data.sh` -> `22 passed, 0 failed`.
- [x] **2.3.5 Deliberate Conflicting Edit to `plugin.json` & Clean Commit (`bugfix/hook-path`)**
  - **Gate:** Committed `f2d51a9` cleanly with `"security-hooks"` keyword edit overlapping `feature/mcp-server`.

---

## Phase 3: Worktree Integration, Conflict Resolution & Safe Cleanup (`v0.2.0` → `v1.0.0`)

**Phase 3 Release Gate:** Gates **G1–G6** pass 100% on `main`; linked worktrees removed & pruned; `version` synchronized to `1.0.0`.

- [x] **3.1 Sequential `--no-ff` Integration on `main`**
  - Merged `feature/skill-tests` (`db2982b`), `feature/mcp-server` (`8276036`), and `bugfix/hook-path` triggering controlled conflict in `plugins/campus-helpdesk/.claude-plugin/plugin.json` (`evidence/logs/worktree-merge-conflict.log`).
- [x] **3.2 Human-Reviewed Conflict Resolution (No Blind `--ours`/`--theirs`)**
  - **Gate:** Retained both `"stdio-mcp"` and `"security-hooks"` (`7f94014`), zero conflict markers remain.
- [x] **3.3 Synchronize `v0.2.0` -> `v1.0.0` Version Metadata**
  - **Gate:** Finalized `"1.0.0"` across `plugin.json`, `marketplace.json`, `mcp-server/package.json` + bundle (`5ddf0b7`).
- [x] **3.4 Full Cross-Subsystem Verification Suite (Gates G1–G5 + Live Smoke)**
  - **Gate:** Re-verified `validate --strict` (x3), `unittest` (`15/15`), `test_protect_data.sh` (`22/22`), `npm run build` + `test` (`10/10`), and zero banned strings in runtime paths.
- [x] **3.5 Safe Worktree Cleanup & Graph Capture (Gate G6)**
  - **Gate:** Removed/pruned all 3 linked worktrees and deleted merged branches (`evidence/logs/worktree-cleanup-and-graph.log`, `part-e-worktree-graph.png`); `git worktree list` shows single `main`.

---

## Phase 4: End-to-End Plugin Lifecycle Verification (`v1.0.0`)

**Phase 4 Release Gate (L1–L8):** Marketplace add/install/inspect/smoke/uninstall/remove lifecycle succeeded cleanly (`evidence/logs/plugin-lifecycle.log`, `plugin-smoke-*.log`, `part-c-plugin-lifecycle.png`).

- [x] **4.1 Strict & Directory Profile Validation** (`validate --strict` x3 passed exit `0`)
- [x] **4.2 Marketplace Registration** (`claude plugin marketplace add ./` succeeded; documented `./` requirement over bare `.`)
- [x] **4.3 Plugin Installation** (`claude plugin install campus-helpdesk@nimbus-campus-marketplace` succeeded)
- [x] **4.4 Plugin Inventory & Component Details Inspection** (`list` + `details` confirmed Skills (2), Hook (1), MCP server (1), ~148 tok always-on)
- [x] **4.5 Live Cached Plugin Smoke Verification** (Verified live `get_fee_status(STU-2026-002)`, `campus://hostel-rules`, and `PreToolUse:Write` `[PADLOCK]` deny keeping `data/protected/` SHA-256 unchanged; plus `/campus-helpdesk:timetable` verified in live trigger log)
- [x] **4.6 Clean Uninstall & Marketplace Removal** (`uninstall` + `marketplace remove` restored clean plugin/marketplace state)

---

## Phase 5: Submission Deliverables Packaging (`v1.0.0` Final Release)

**Phase 5 Release Gate (D1–D5):** Typst PDFs compiled with zero warnings, all pages visually inspected, Prompt Log includes 7+ caught AI errors/fixes, and `.zip` archive undergoes integrity + extracted validation.

- [x] **5.1 Typst Visual Token & Template Implementation** (`report/tokens.typ` + `report/assets/architecture.svg` compiled on `typst 0.15.1`)
- [x] **5.2 Author Typst Report Content (Parts A–F)** (`report/main.typ` -> `report/Campus-Helpdesk-Toolchain-Report.pdf`, 22 pages, 294-word reflection, full Source List dated `2026-11-17`)
- [x] **5.3 Visual Page & Accessibility Inspection of Compiled PDF** (Rendered all pages PNG at 144 ppi, fixed nested fence, `$GIT_COMMON_DIR` escape, Part C orphan lines, and Part E header stickiness; visually verified clean layout)
- [x] **5.4 Standalone Prompt Log Deliverable** (`report/Prompt-Log.md` & `report/prompt-log.typ` -> `report/Prompt-Log.pdf`, `PL-01`–`PL-10` with 7 audited catches)
- [ ] **5.5 Clean Repository `.zip` Archive Creation & Integrity Check**
  - Package clean `.zip` archive and extract into temporary directory to verify `unzip -tq`, `validate --strict`, unit tests, hook tests, and bundled MCP stdio probe before ticking `[x]`.
