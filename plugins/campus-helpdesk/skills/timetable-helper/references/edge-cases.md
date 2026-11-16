# Timetable Query Edge Cases & Anti-Fabrication Playbook

Consult this reference when handling normalization quirks, weekend queries, unknown batches, non-existent course codes, lab splits, or cross-listed electives.

## 1. Weekend Queries (`Saturday`, `Sunday`)

- `Saturday` and `Sunday` are **valid** weekday inputs (`DAY_ORDER` indices `5` and `6`).
- `scripts/query_timetable.py` exits with code `0`, `matched: 0`, and `rows: []` (and `get_timetable` returns `classes: []`).
- **Required Behavior:** State explicitly that no regular classes are scheduled on Saturday/Sunday in `assets/timetable.csv` (`Asia/Kolkata (IST)`). Never invent makeup lectures, extra labs, or club sessions.

## 2. Day & Batch Normalization Rules

- **Day Normalization (`--day`):**
  - Case-insensitive full names and standard prefixes map deterministically:
    - `mon`, `monday` → `Monday`
    - `tue`, `tues`, `tuesday` → `Tuesday`
    - `wed`, `wednesday` → `Wednesday`
    - `thu`, `thur`, `thurs`, `thursday` → `Thursday`
    - `fri`, `friday` → `Friday`
    - `sat`, `saturday` → `Saturday`
    - `sun`, `sunday` → `Sunday`
  - Unrecognized day tokens (e.g., `Funday`, `Tomorrow`, `""`) fail deterministically in `query_timetable.py` with exit code `2` and a JSON error payload on `stderr`. Resolve relative terms like *"today"* or *"tomorrow"* to a concrete weekday before invoking the script.
- **Batch Normalization (`--batch`):**
  - Trimmed, uppercased, with spaces and underscores collapsed to single hyphens:
    - `"cse a"` / `"cse_a"` / `"CSE-A"` → `CSE-A`
    - `"cse b"` / `"cse_b"` → `CSE-B`
    - `"ece a"` / `"ece_a"` → `ECE-A`
    - `"ai ds a"` / `"ai_ds_a"` / `"AI-DS-A"` → `AI-DS-A`

## 3. Unknown Batch Refusals (e.g., `MECH-Z`, `CSE-Z`)

- An unrecognized batch code is **not** a crash; `query_timetable.py` exits `0` with `matched: 0`, `rows: []`, and `valid_batches: ["AI-DS-A", "CSE-A", "CSE-B", "ECE-A"]`.
- **Required Behavior:** Refuse to synthesize or clone rows from another batch (for example, never copy `CSE-A` slots for `MECH-Z` or `CSE-Z`). Report clearly that the requested batch does not exist in `assets/timetable.csv` and display only the `valid_batches` list returned by the script.

## 4. Adversarial / Non-Existent Course Codes (e.g., `CS999`)

- When a user asks for a course code absent from the dataset (such as `CS999`, `CS-999`, or *"AI Ethics"* when not present), `query_timetable.py --course CS999` returns `matched: 0`.
- **Required Behavior:**
  - Confirm `0` matching rows exist in `assets/timetable.csv`.
  - **Never** invent a room number, instructor, or time slot.
  - Offer constructive next steps using verified data only (for example, listing the actual classes scheduled for the user's batch on that day).

## 5. Missing Batch in Natural-Language Queries

- If the user asks *"What classes are on Tuesday?"* without naming a batch, course, or room, ask one concise clarifying question listing the valid batches (`AI-DS-A`, `CSE-A`, `CSE-B`, `ECE-A`) rather than guessing a default batch or dumping every batch unprompted.

## 6. Lab Sub-Batches (`L1` / `L2`) & Cross-Listed Electives

- **Batch-Specific Lab Rooms:** Different batches taking the same course can have distinct lab rooms and days. For instance, `CS-301L` (Distributed Systems Lab) runs in `LAB-3B` on Monday for `CSE-A`, whereas `CSE-B` has `CS-301L` in `LAB-3A` on Tuesday. Never carry over a room or slot from one batch to another.
- **Lab Sub-Batch Splits (`L1` / `L2`):** If future schedule updates include sub-batch tags (`L1`/`L2`) in `session_type` or `batch` annotations, preserve exact row annotations verbatim without merging sub-batches into a single room.
- **Cross-Listed Electives:** Shared courses (e.g., `CS-301` appearing in both `CSE-A` and `CSE-B`) are stored as explicit per-batch rows. Query with `--batch` to isolate one section or `--course` to inspect all sections sharing a course code.
