## Claude Code Local Sync (ccusage) — User Guide

**Product:** AICoder.Guru  
**Audience:** Individual developers + teams  
**Purpose:** Get Claude Code usage from your laptop into AICoder.Guru (no Claude “Team plan” API required).

---

### What this does (and why)

Claude Code stores usage data locally as JSONL logs. AICoder.Guru can ingest that usage **after you export it to JSON** using `ccusage`, then **upload** it to your account so it can be:
- charted over time
- aggregated per user
- aggregated across your org/team (if you’re in a team workspace)

`ccusage` runs 100% locally and reads Claude Code’s local data directories:
- `~/.config/claude/projects/` (newer)
- `~/.claude/projects/` (legacy)

Reference: [`ccusage` JSON output guide](https://ccusage.com/guide/json-output/)

---

### Privacy / what gets uploaded

AICoder.Guru only needs **usage metrics**:
- tokens (input/output/cache)
- model name
- date/time buckets
- estimated cost (if present)

It does **not** need (and we recommend you do not upload):
- prompts
- code
- file paths
- transcript content

Tip: avoid `--instances` / project-grouped exports unless you explicitly want project-level analysis later (project names can be sensitive).

---

### Step 1 — Generate your ccusage JSON export

From a terminal on the machine where you use Claude Code, run:

```bash
npx ccusage@latest daily --json --breakdown > ccusage-daily.json
```

Notes:
- `--breakdown` is strongly recommended: it includes per-model usage so charts are more useful.
- If you omit `--breakdown`, the import will still work, but results may collapse into a single “TOTAL” model row per day (less detailed).

Optional filters:

```bash
# last 30 days (YYYYMMDD format)
npx ccusage@latest daily --json --breakdown --since 20260101 --until 20260201 > ccusage-daily.json

# use UTC timezone grouping
npx ccusage@latest daily --json --breakdown --timezone UTC > ccusage-daily.json
```

---

### Step 2 — Upload to AICoder.Guru

1. Sign in to AICoder.Guru (recommended so the data is saved).
2. Go to **My Usage**.
3. In the import card, use **“Import Claude Code usage (ccusage JSON)”**.
4. Drag & drop `ccusage-daily.json` (or click to select it).

What you should see:
- The chart updates immediately.
- If you’re logged in, you’ll see a “Saving to your account…” indicator, and then a success message showing:
  - how many rows were saved
  - how many duplicates were skipped

---

### Step 3 — Re-sync (keep it up to date)

Today, “local sync” is **manual**: run the export command again and upload the new JSON file.

You can do this daily/weekly, or whenever you want your dashboard refreshed.

Good practice:
- Export with a rolling window (e.g. last 30–90 days) and re-upload.
- Duplicates are automatically skipped, so re-uploading overlapping periods is safe.

---

### Troubleshooting

#### “No usage rows found” / import fails
- Confirm you ran a **daily** report export:
  - ✅ `ccusage daily --json --breakdown`
  - ❌ `ccusage session --json` (not supported by the current importer yet)
- Confirm the file is valid JSON (not a screenshot / not truncated).
- Ensure you’re exporting on a machine that actually has Claude Code logs.

#### “Saved 0, duplicates N”
- This usually means you already uploaded the same data (same file hash / same events).
- If you expected new data, regenerate the JSON after you’ve used Claude Code more.

#### I used `--instances` and I’m worried about project names
- Re-export without `--instances` and re-upload.
- (If you want: we can add a “strip project metadata” option in a future iteration.)

#### Charts look “empty” after upload
- Check your chart time window preset (Last 24h/48h/7d/30d).  
  If you imported historical days only, switch to Custom or Last 30d.

---

### FAQ

#### Does this work for Claude Code Max plan?
Yes—because it uses your local Claude Code logs rather than an external billing API.

#### Can my org aggregate this per user?
Yes. Each user uploads to their own account; org dashboards can aggregate across members (depending on your org setup and permissions).

#### Is there an automatic background agent?
Not yet. The next step is a lightweight local agent that runs on your machine and uploads deltas automatically after a one-time pairing flow.

