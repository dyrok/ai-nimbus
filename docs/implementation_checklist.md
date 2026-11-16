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

### 2.0 Linked Worktree Provisioning (Execute from Clean `main`)

- [ ] **2.0.1 Create Sibling Linked Worktrees**
  - Provision three isolated sibling worktrees from `main`:
    - `git worktree add -b feature/skill-tests ../ai-nimbus-wt-skill-tests main`
    - `git worktree add -b feature/mcp-server  ../ai-nimbus-wt-mcp-server  main`
    - `git worktree add -b bugfix/hook-path    ../ai-nimbus-wt-hook-path    main`
  - **Gate:** `git worktree list` prints exactly 4 entries (`/Users/ns/code/ai-nimbus [main]` plus all 3 sibling paths on their exact branches); capture output for Report Part E.

---

### 2.1 Workstream A — `feature/skill-tests` (`../ai-nimbus-wt-skill-tests`)

**Workstream A Gate (G2 + Live Triggering):** Static `SKILL.md` checks pass, `python3 -m unittest discover -s tests/skill -v` passes 100%, and `6+` live Claude Code triggering tests + `2` `description` rewrite experiments are logged.

- [ ] **2.1.1 Skill Definition (`plugins/campus-helpdesk/skills/timetable-helper/SKILL.md`)**
  - Author `SKILL.md` with YAML frontmatter containing **only** `name: timetable-helper` and `description` (`<= 1024` chars), body strictly `< 500` lines (`~110–160` lines target), Tier 2 procedural routing (`query_timetable.py` + `get_timetable` MCP equivalence), Tier 3 on-demand reference pointers, CSV prompt-injection skepticism, and Anti-Fabrication Grounding Invariant. Ensure **no** `skill.config.yaml` exists.
  - **Gate:** `wc -l plugins/campus-helpdesk/skills/timetable-helper/SKILL.md` is `< 500`; `test ! -e plugins/campus-helpdesk/skills/timetable-helper/skill.config.yaml` exits `0`; `claude plugin validate --strict ./plugins/campus-helpdesk` exits `0`.
- [ ] **2.1.2 Tier 3 References (`references/csv-dictionary.md`, `references/edge-cases.md`)**
  - Write `references/csv-dictionary.md` (11-column schema, IST `HH:MM`, `LECTURE`/`LAB`/`TUTORIAL`, batches `CSE-A`, `CSE-B`, `ECE-A`, `AI-DS-A`) and `references/edge-cases.md` (weekends, day/batch normalization, unknown batch refusal, lab sub-batches `L1`/`L2`, cross-listed electives).
  - **Gate:** Files exist and match exact column names/batches in `assets/timetable.csv`.
- [ ] **2.1.3 Canonical CSV Fixture (`assets/timetable.csv`)**
  - Author `plugins/campus-helpdesk/skills/timetable-helper/assets/timetable.csv` in UTF-8 (no BOM), Unix LF (`\n`), RFC 4180 quoting with 11-column header `batch,day,start_time,end_time,course_code,course_title,session_type,room,instructor,credits,term` covering `CSE-A`, `CSE-B`, `ECE-A`, `AI-DS-A` across `Monday`–`Friday` (100% synthetic mock data).
  - **Gate:** Python `csv.DictReader` parses all rows with zero missing fields and LF-only line endings.
- [ ] **2.1.4 Deterministic Python Stdlib Query Script (`scripts/query_timetable.py`)**
  - Implement pure Python 3 stdlib script supporting `--batch`, `--day`, `--course`, `--room`, `--csv`, `--format {json,markdown}`, `--list-batches`; canonicalizing `day` and `batch`, sorting by `(DAY_ORDER[day], start_time, course_code)`, returning exit `0` for valid queries (including `0` rows + `valid_batches`) and exit `2` + JSON error on `stderr` for bad `--day` or missing/malformed CSV.
  - **Gate:** Smoke runs (`--batch "cse a" --day mon --format json`, `--batch MECH-Z --day Monday --format json`, `--day Funday` returning exit `2`) produce expected outputs regardless of `cwd`.
- [ ] **2.1.5 Slash Command (`plugins/campus-helpdesk/commands/timetable.md`)**
  - Author `/campus-helpdesk:timetable` command with `description`, `argument-hint: "<batch> [day]"`, `$ARGUMENTS` handling, `${CLAUDE_PLUGIN_ROOT}` script invocation, and Anti-Fabrication Grounding Invariant.
  - **Gate:** `claude plugin validate --strict ./plugins/campus-helpdesk` exits `0`.
- [ ] **2.1.6 Python Unit Tests (`tests/skill/test_query_timetable.py`)**
  - Implement `unittest` suite covering batch/day normalization, chronological sorting, empty weekend queries (`Saturday`/`Sunday`), unknown batch `MECH-Z` (`matched == 0` + `valid_batches`), `--course`, `--room`, `--list-batches`, `--format markdown`, and invalid `--day`/missing CSV exit code `2`.
  - **Gate:** `python3 -m unittest discover -s tests/skill -v` exits `0` with all tests passing.
- [ ] **2.1.7 Live Claude Code Triggering Tests (6+ Prompts) & 2 `description` Rewrites**
  - Execute `>= 6` live `claude -p --plugin-dir ./plugins/campus-helpdesk` triggering prompts (e.g., direct batch/day query, indirect natural-language schedule question, room/course lookup, weekend check, ambiguous batch query, and **adversarial non-existent class prompt** like `CS999`) across baseline `description` + **2 iterative `description` rewrites**, logging exact triggers, responses, and anti-fabrication adherence for Report Part B.
  - **Gate:** Transcripts/logs saved with `>= 6` prompt runs, verified non-fabrication on `CS999`, and documented comparative metrics across initial + 2 `description` rewrites.
- [ ] **2.1.8 Commit `feature/skill-tests` Cleanly**
  - Commit all owned files (`skills/timetable-helper/**`, `commands/timetable.md`, `tests/skill/**`) in `../ai-nimbus-wt-skill-tests`.
  - **Gate:** `git -C ../ai-nimbus-wt-skill-tests status --short` is empty.

---

### 2.2 Workstream B — `feature/mcp-server` (`../ai-nimbus-wt-mcp-server`)

**Workstream B Gate (G4 + G5 + Inspector):** `npm run build` and `npm test` pass 100%, `stdout` has zero non-JSON bytes, and 3 MCP Inspector captures + annotated JSON-RPC pairs are recorded.

- [ ] **2.2.1 Package & TypeScript Configuration (`mcp-server/package.json`, `tsconfig.json`, `README.md`)**
  - Configure ESM package (`"type": "module"`) pinning `@modelcontextprotocol/sdk@^1.32.2` and `zod@^4.0.0`, `devDependencies` (`@types/node`, `esbuild`, `tsx`, `typescript`), scripts (`typecheck`, `build:tsc`, `build:bundle`, `build`, `test`, `start`), and strict `NodeNext` `tsconfig.json`.
  - **Gate:** `npm --prefix mcp-server install` succeeds and `npm --prefix mcp-server ls @modelcontextprotocol/sdk zod` resolves verified packages without `@nimbus/mcp-skill-bridge`.
- [ ] **2.2.2 Mock Campus Data & Canonical Hostel Rules (`mcp-server/src/data.ts`, `mcp-server/data/hostel_rules.md`)**
  - Author `src/data.ts` with timetable entries aligned **1:1** to `skills/timetable-helper/assets/timetable.csv`, synthetic fee ledger (`STU-2026-001`..`STU-2026-005`), and `loadHostelRulesMarkdown()` resolving `process.env.CAMPUS_DATA_DIR` or `../data/hostel_rules.md`.
  - Author `mcp-server/data/hostel_rules.md` with clear numbered sections (curfew, visitors, appliances/kettles, mess hours, disciplinary escalation).
  - **Gate:** Cross-check confirms timetable fixture parity between `src/data.ts` and `assets/timetable.csv`.
- [ ] **2.2.3 Stderr-Only Logger & MCP Server Implementation (`src/logger.ts`, `src/server.ts`, `src/index.ts`)**
  - Implement `src/logger.ts` writing strictly to `process.stderr` (`console.error` with `[ISO-TS] [nimbus:info|warn|err]` format).
  - Implement `src/server.ts` registering `get_timetable` (`z.object({ batch, day })`), `get_fee_status` (`z.object({ student_id })` regex `^STU-\d{4}-\d{3}$/i`), and resource `campus://hostel-rules` (`McpError(ErrorCode.InternalError)` on unreadable file).
  - Implement `src/index.ts` connecting `McpServer` to `StdioServerTransport` without emitting a single byte on `stdout`.
  - **Gate:** `grep -rnE "console\.(log|info|debug)|process\.stdout\.write" mcp-server/src` returns zero matches; `npm --prefix mcp-server run typecheck` exits `0`.
- [ ] **2.2.4 Dual-Output Bundle & Sync Script (`mcp-server/scripts/bundle-plugin.mjs`)**
  - Implement `bundle-plugin.mjs` running `esbuild` (`bundle: true`, `platform: "node"`, `format: "esm"`, `target: "node20"`, CJS `createRequire` banner) to emit `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` and copy `mcp-server/data/hostel_rules.md` -> `plugins/campus-helpdesk/data/hostel_rules.md`.
  - **Gate:** `npm --prefix mcp-server run build` produces both `mcp-server/dist/index.js` and `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` plus synced `plugins/campus-helpdesk/data/hostel_rules.md`, and running `node plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` outside `mcp-server/` starts cleanly without `node_modules`.
- [ ] **2.2.5 Plugin MCP Config (`plugins/campus-helpdesk/.mcp.json`)**
  - Create `plugins/campus-helpdesk/.mcp.json` using `"type": "stdio"`, `"command": "node"`, `"args": ["${CLAUDE_PLUGIN_ROOT}/servers/campus-helpdesk-mcp.mjs"]`, `"env": { "CAMPUS_DATA_DIR": "${CLAUDE_PLUGIN_ROOT}/data" }`.
  - **Gate:** `claude plugin validate --strict ./plugins/campus-helpdesk` exits `0`.
- [ ] **2.2.6 MCP Unit & Subprocess Stdio Protocol Tests (`mcp-server/tests/*.test.ts`)**
  - Write `tools-and-resources.test.ts` (valid lookups, weekend empty state, `isError: true` on `MECH-Z`/`STU-2026-999`, Zod `-32602` on missing/malformed inputs, `campus://hostel-rules` read & missing-file `-32603`) and `stdio-protocol.test.ts` (spawning subprocess, verifying newline-delimited JSON-RPC only on `stdout`, diagnostics on `stderr`).
  - **Gate:** `npm --prefix mcp-server test` exits `0` with zero skipped assertions.
- [ ] **2.2.7 MCP Inspector Captures & JSON-RPC Trace Artifacts**
  - Run `@modelcontextprotocol/inspector` (`npx @modelcontextprotocol/inspector ...`) against `plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` and capture:
    - **Capture A:** `initialize` + `notifications/initialized` capability negotiation
    - **Capture B:** `tools/list`, grounded `tools/call` (`get_timetable` / `get_fee_status`), and `resources/list` + `resources/read` (`campus://hostel-rules`)
    - **Capture C:** Error/refusal call (`isError: true` or `-32602`) + Inspector `stderr`/notifications pane proving `stdout` purity
  - Save screenshots + paired `[REQ id=N]` / `[RES id=N]` JSON-RPC trace excerpts for Report Part D.
  - **Gate:** All 3 Inspector captures and raw paired JSON-RPC logs are saved and legible (`100 cols x 32 rows` framing).
- [ ] **2.2.8 Branch Metadata Edit & Clean Commit (`feature/mcp-server`)**
  - Update `plugins/campus-helpdesk/.claude-plugin/plugin.json` (`"description"`, `"version": "0.2.0-mcp"`, or aligned branch edit adding `"stdio-mcp"` to `"keywords"`).
  - Commit all owned files (`mcp-server/**`, `plugins/campus-helpdesk/servers/**`, `plugins/campus-helpdesk/.mcp.json`, `plugins/campus-helpdesk/data/hostel_rules.md`, `plugins/campus-helpdesk/.claude-plugin/plugin.json`) in `../ai-nimbus-wt-mcp-server`.
  - **Gate:** `git -C ../ai-nimbus-wt-mcp-server status --short` is empty (confirm `node_modules/` and `dist/` remain untracked/ignored).

---

### 2.3 Workstream C — `bugfix/hook-path` (`../ai-nimbus-wt-hook-path`)

**Workstream C Gate (G3 + Conflict Setup):** Adversarial hook test script passes 100% (blocking direct, `../`, `//`, symlink, and malformed payloads while allowing safe workspace paths), `data/protected/*` permissions are `0444`, and `plugin.json` carries the deliberate conflicting edit.

- [ ] **2.3.1 Hook Declaration (`plugins/campus-helpdesk/hooks/hooks.json`)**
  - Author nested wrapper `{ "hooks": { "PreToolUse": [{ "matcher": "Write|Edit", "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/scripts/protect-data.sh\"" }] }] } }`.
  - **Gate:** `claude plugin validate --strict ./plugins/campus-helpdesk` exits `0`.
- [ ] **2.3.2 Protected-Data Guard Script (`plugins/campus-helpdesk/hooks/scripts/protect-data.sh`)**
  - Author executable (`chmod +x`) script with `set -euo pipefail`, using Python 3 stdlib (`os.path.realpath`, `os.path.normpath`, `Path.parts`) to resolve `file_path` against `cwd`, fail closed on malformed JSON or missing `tool_input.file_path`, check `("data", "protected")` segment tuple and `${CLAUDE_PLUGIN_ROOT}/data/protected`, emit `hookSpecificOutput` JSON (`permissionDecision: "deny"`, warm `[PADLOCK]` guidance suggesting `proposals/`) on `stdout` with `exit 0`, and emit empty `stdout` (`exit 0`) on safe paths.
  - **Gate:** `test -x plugins/campus-helpdesk/hooks/scripts/protect-data.sh` exits `0`; `bash -n plugins/campus-helpdesk/hooks/scripts/protect-data.sh` exits `0`.
- [ ] **2.3.3 Immutable Protected Mock Fixtures (`plugins/campus-helpdesk/data/protected/`)**
  - Populate 100% synthetic protected records: `fee_ledger_master.json`, `academic_calendar_2026.csv`, and `warden_escalation_roster.json`, and apply `chmod 0444` read-only permissions.
  - **Gate:** All 3 files exist, pass JSON/CSV syntax check, contain zero real PII, and show `-r--r--r--` (`0444`) mode.
- [ ] **2.3.4 Adversarial Hook Test Suite (`tests/hooks/test_protect_data.sh`)**
  - Implement shell test harness piping simulated Claude Code `PreToolUse` JSON payloads covering:
    - Direct `Write` to `plugins/campus-helpdesk/data/protected/fee_ledger_master.json` -> denied
    - `Edit` via `../` traversal (`plugins/campus-helpdesk/data/../data/protected/academic_calendar_2026.csv`) -> denied
    - Duplicate-slash obfuscation (`plugins/campus-helpdesk/data//protected/warden_escalation_roster.json`) -> denied
    - Symlink pointing inside `data/protected/` -> denied
    - Non-existent file under `data/protected/new.json` (lexical guard) -> denied
    - Malformed `stdin` JSON & missing `file_path` (fail-closed) -> denied
    - Safe workspace target (`proposals/fix.md`) -> allowed (exit `0`, empty `stdout`)
    - Similarly named safe folder (`data_protected_backup/note.md`) -> allowed (exit `0`, empty `stdout`)
  - **Gate:** `bash tests/hooks/test_protect_data.sh` exits `0` with all assertions passing.
- [ ] **2.3.5 Deliberate Conflicting Edit to `plugin.json` & Clean Commit (`bugfix/hook-path`)**
  - Independently edit the same lines (`"description"`, `"version"`, `"keywords"`) in `plugins/campus-helpdesk/.claude-plugin/plugin.json` as `feature/mcp-server`, adding `"security-hooks"` to `"keywords"` and updating `"description"` to document `PreToolUse` path-traversal hardening.
  - Commit all owned files (`hooks/**`, `data/protected/**`, `tests/hooks/**`, `.claude-plugin/plugin.json`) in `../ai-nimbus-wt-hook-path`.
  - **Gate:** `git -C ../ai-nimbus-wt-hook-path status --short` is empty; `git diff main..bugfix/hook-path -- plugins/campus-helpdesk/.claude-plugin/plugin.json` confirms overlapping line modifications vs `feature/mcp-server`.

---

## Phase 3: Worktree Integration, Conflict Resolution & Safe Cleanup (`v0.2.0` → `v1.0.0`)

**Phase 3 Release Gate:** Gates **G1–G6** and live headless **UX/ADV** checks pass 100% on `main`; linked worktrees removed & pruned; `version` synchronized to `1.0.0`.

- [ ] **3.1 Sequential `--no-ff` Integration on `main`**
  - Switch to `/Users/ns/code/ai-nimbus` (`main`).
  - Run `git merge --no-ff feature/skill-tests -m "Merge feature/skill-tests into main"` (verify clean merge).
  - Run `git merge --no-ff feature/mcp-server -m "Merge feature/mcp-server into main"` (verify clean merge).
  - Run `git merge --no-ff bugfix/hook-path` and confirm expected deterministic merge conflict in `plugins/campus-helpdesk/.claude-plugin/plugin.json`.
  - **Gate:** Save raw `git status` and `git diff` conflict marker output for Report Part E.
- [ ] **3.2 Human-Reviewed Conflict Resolution (No Blind `--ours`/`--theirs`)**
  - Manually resolve `plugins/campus-helpdesk/.claude-plugin/plugin.json` retaining **both** `"stdio-mcp"` and `"security-hooks"` in `"keywords"`, unified `"description"` covering skill + hooks + stdio MCP server, and synchronized release version (`"0.2.0"` integration checkpoint or `"1.0.0"` release target).
  - **Gate:** `python3 -m json.tool plugins/campus-helpdesk/.claude-plugin/plugin.json > /dev/null` exits `0`; zero `<<<<<<<` / `=======` / `>>>>>>>` markers remain anywhere (`git diff --check` exits `0`).
- [ ] **3.3 Synchronize `v0.2.0` -> `v1.0.0` Version Metadata**
  - After validating `v0.2.0` integrated build, finalize version `"1.0.0"` across:
    - `plugins/campus-helpdesk/.claude-plugin/plugin.json` (`"version": "1.0.0"`)
    - `.claude-plugin/marketplace.json` (`metadata.version: "1.0.0"` and `plugins[0].version: "1.0.0"`)
    - `mcp-server/package.json` (`"version": "1.0.0"`) & rebuild bundle (`npm --prefix mcp-server run build`) so server `serverInfo.version` matches `1.0.0`.
  - **Gate:** All three JSON files report `"1.0.0"`; `claude plugin validate --strict .` exits `0`.
- [ ] **3.4 Full Cross-Subsystem Verification Suite (Gates G1–G5 + Headless UX/ADV)**
  - Run and record outputs of:
    - **G1:** `claude plugin validate --strict . && claude plugin validate --strict ./plugins/campus-helpdesk && claude plugin validate --strict --profile directory ./plugins/campus-helpdesk`
    - **G2:** `python3 -m unittest discover -s tests/skill -v`
    - **G3:** `bash tests/hooks/test_protect_data.sh`
    - **G4:** `npm --prefix mcp-server run build`
    - **G5:** `npm --prefix mcp-server test`
    - **UX/ADV Live Smoke:** Headless `claude -p --plugin-dir ./plugins/campus-helpdesk --output-format stream-json --include-hook-events --no-session-persistence --permission-prompts none` covering `UX-01`..`UX-11` / `ADV-01`..`ADV-06` and `--ax-screen-reader` output; verify SHA-256 checksums of `plugins/campus-helpdesk/data/protected/*` are unchanged.
  - **Gate:** Every single command exits `0` with zero skipped tests or modified protected files; finalize merge/version commit on `main`.
- [ ] **3.5 Safe Worktree Cleanup & Graph Capture (Gate G6)**
  - Run:
    - `git worktree remove ../ai-nimbus-wt-skill-tests`
    - `git worktree remove ../ai-nimbus-wt-mcp-server`
    - `git worktree remove ../ai-nimbus-wt-hook-path`
    - `git worktree prune --verbose`
    - `git branch -d feature/skill-tests feature/mcp-server bugfix/hook-path`
  - Capture `git worktree list`, `git status`, and `git log --graph --oneline --decorate --all` for Report Part E.
  - **Gate:** `git worktree list` shows **only** `/Users/ns/code/ai-nimbus [main]`; `git status` is clean; sibling `../ai-nimbus-wt-*` folders are gone.

---

## Phase 4: End-to-End Plugin Lifecycle Verification (`v1.0.0`)

**Phase 4 Release Gate (L1–L8):** Complete marketplace install/inspect/run/uninstall/remove lifecycle succeeds against `~/.claude/plugins/cache/...` with captured logs and screenshots, leaving the host clean afterward.

- [ ] **4.1 Strict & Directory Profile Validation**
  - Run `claude plugin validate --strict .`, `claude plugin validate --strict ./plugins/campus-helpdesk`, and `claude plugin validate --strict --profile directory ./plugins/campus-helpdesk`.
  - **Gate:** All three invocations exit `0` with `"errors": []` and `"warnings": []`; save terminal output/screenshot for Part C.
- [ ] **4.2 Marketplace Registration**
  - Run `claude plugin marketplace add .` and `claude plugin marketplace list`.
  - **Gate:** `nimbus-campus-marketplace` appears in marketplace list; capture output/screenshot.
- [ ] **4.3 Plugin Installation**
  - Run `claude plugin install campus-helpdesk@nimbus-campus-marketplace`.
  - **Gate:** Command exits `0` and installs plugin into Claude Code's plugin cache without errors; capture output/screenshot.
- [ ] **4.4 Plugin Inventory & Component Details Inspection**
  - Run `claude plugin list` and `claude plugin details campus-helpdesk@nimbus-campus-marketplace`.
  - **Gate:** `campus-helpdesk@nimbus-campus-marketplace` shows `version: 1.0.0`, enabled state, skill (`timetable-helper`), command (`/campus-helpdesk:timetable`), hook (`PreToolUse`), and MCP server (`campus-helpdesk`); capture output/screenshot.
- [ ] **4.5 Live Cached Plugin Smoke Verification**
  - Launch a verification prompt/session using the **installed** marketplace plugin (without `--plugin-dir`, verifying `${CLAUDE_PLUGIN_ROOT}` resolves inside `~/.claude/plugins/cache/...`) to test:
    - `/campus-helpdesk:timetable CSE-B Tuesday` (Skill + Python script)
    - MCP tool call (`get_fee_status` for `STU-2026-002`) & resource read (`campus://hostel-rules`)
    - `PreToolUse` `Write` block against `data/protected/` inside cached/repo context
  - **Gate:** Cached MCP bundle (`campus-helpdesk-mcp.mjs`) executes cleanly without `node_modules` in cache and zero parent `..` path errors; capture logs/screenshots.
- [ ] **4.6 Clean Uninstall & Marketplace Removal**
  - Run `claude plugin uninstall campus-helpdesk@nimbus-campus-marketplace`, `claude plugin marketplace remove nimbus-campus-marketplace`, followed by `claude plugin list` and `claude plugin marketplace list`.
  - **Gate:** Both `campus-helpdesk` and `nimbus-campus-marketplace` are absent from post-removal listings; capture output/screenshot.

---

## Phase 5: Submission Deliverables Packaging (`v1.0.0` Final Release)

**Phase 5 Release Gate (D1–D5):** Typst report PDF compiles cleanly with zero visual/layout defects, all required Parts A–F & standalone Prompt Log pass audit, and clean `.zip` archive validates end-to-end upon test extraction.

- [ ] **5.1 Typst Visual Token & Template Implementation**
  - Create Typst source modules following `docs/design.md` (`tokens.typ`, A4 `210mm x 297mm`, `22mm`/`20mm` margins, verified `#1E3A5F` / `#1E293B` / `#F8FAFC` / `#D97706` / `#DC2626` / `#047857` contrast palette, `Libertinus Serif` / `Inter` / `DejaVu Sans Mono`, tabular lining numerals, borderless-vertical audit tables, vector SVG diagrams).
  - **Gate:** `typst --version` confirms `0.15.x` (`0.15.1` verified); modular compilation passes without unknown font or macro errors.
- [ ] **5.2 Author Typst Report Content (Parts A–F)**
  - **Part A (Architecture & Claim Audit):** Architecture synthesis (Skill vs MCP vs Hooks vs Worktrees) + audit table refuting all 6 traps (`@nimbus/mcp-skill-bridge`, `skill.config.yaml`, `2025-02-30`, `/worktree-merge`, `git worktree sync --all`, `"NimbusSync Plugin Standard v4.2"`).
  - **Part B (Agent Skill Engineering & Triggering Experiments):** 3-tier `SKILL.md` explanation, `unittest` evidence, `6+` live triggering test logs (including adversarial `CS999` non-existent class refusal), and `2` `description` rewrite iterations with comparison table.
  - **Part C (Plugin Packaging, Lifecycle Evidence & Threat Model):** `marketplace.json` + `plugin.json` + `${CLAUDE_PLUGIN_ROOT}` cache invariant, Phase 4 CLI screenshots/logs, and Threat Model covering prompt injection, shell-executing hook RCE, MCP tool poisoning, and why deterministic `PreToolUse` hooks beat prompt-only rules.
  - **Part D (MCP Server, Inspector Evidence & JSON-RPC Traces):** `@modelcontextprotocol/sdk@1.32.2` + `zod` schema boundary, `stdout`/`stderr` proof, 3 MCP Inspector screenshots/logs (Captures A, B, C), and annotated `[REQ id=N]` / `[RES id=N]` JSON-RPC pairs.
  - **Part E (Git Worktrees, Conflict Resolution & Conceptual Q&A):** `git worktree list`, `$GIT_COMMON_DIR` vs per-worktree state diagram/analysis, `plugin.json` conflict diff + human-reviewed resolution, `remove`/`prune` + `git log --graph` logs, and conceptual answers (including non-existence of `git worktree sync --all` and `/worktree-merge`).
  - **Part F (Reflection, Prompt Log & Source List):**
    - ~300-word critical engineering reflection (verify word count `~270–330` words).
    - Embedded Prompt Log summary highlighting **`>= 5` verified AI-error detections** caught during development.
    - Verified Source List citing exact URLs and access date **`2026-11-17`**.
  - **Gate:** `typst compile` outputs PDF with exit `0` and zero compiler warnings.
- [ ] **5.3 Visual Page & Accessibility Inspection of Compiled PDF**
  - Export pages (`typst compile -f png ... page-{0p}-of-{t}.png`) and visually inspect every page for clipped code blocks, overflowing tables, unreadable screenshot text, contrast issues, or orphaned headings.
  - **Gate:** Every page renders cleanly within `20–22mm` margins with legible screenshots/diagrams.
- [ ] **5.4 Standalone Prompt Log Deliverable**
  - Produce clean standalone Prompt Log file documenting chronological engineering prompts across phases and **`>= 5` verified AI-error catches** (including exact original flawed AI output, verification check that caught it, and authoritative fix applied).
  - **Gate:** Contains `>= 5` distinct verified AI-error catches with concrete tool/spec citations; zero real PII.
- [ ] **5.5 Clean Repository `.zip` Archive Creation & Integrity Check**
  - Package clean `.zip` archive from tracked repository files + finalized submission artifacts (excluding `.git/` if prohibited or per submission spec, or using `git archive` + verified artifacts—verify **zero** `node_modules/`, `dist/`, `.DS_Store`, or temp scratch files inside zip).
  - Extract archive into a temporary verification directory and run:
    - `unzip -tq <archive>.zip`
    - `claude plugin validate --strict <extracted>/` & `claude plugin validate --strict <extracted>/plugins/campus-helpdesk`
    - `python3 -m unittest discover -s <extracted>/tests/skill -v`
    - `bash <extracted>/tests/hooks/test_protect_data.sh`
    - `npm --prefix <extracted>/mcp-server ci && npm --prefix <extracted>/mcp-server run build && npm --prefix <extracted>/mcp-server test` (or `node <extracted>/plugins/campus-helpdesk/servers/campus-helpdesk-mcp.mjs` direct stdio probe).
  - **Gate:** `unzip -tq` exits `0`; zip contains zero `node_modules/` or `.DS_Store`; extracted copy passes strict plugin validation and all unit/hook/MCP checks cleanly.
