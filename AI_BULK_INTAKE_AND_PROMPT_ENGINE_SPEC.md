# 🧠 AI Bulk Intake & Master Prompt Extraction Engine
## Architectural Specification & Operational Proposal

---

## 1. Executive Vision & Problem Statement

Recruiters frequently receive candidate information in completely unstructured, fragmented, and messy formats:
* Raw copy-pastes from emails or WhatsApp threads
* Messy notes from screening calls or Google Docs
* Scraped LinkedIn profiles or unformatted ATS exports
* CSV/spreadsheet dumps with mismatched column headers

Manually formatting each candidate, figuring out their timezone, creating their profile, and finding clash-free interview slots across multiple calendar tracks takes **15 to 30 minutes per candidate batch**.

### The Solution: "Prompt -> External AI -> Paste -> BOOM Schedule"
This proposed feature creates a seamless, two-part intelligent pipeline inside **RecruitSync**:
1. **Master AI Extraction Prompt Section:** An expertly tuned system prompt embedded directly in the app. A recruiter simply clicks **"Copy Master AI Prompt"**, pastes it into *any* external AI chatbot (ChatGPT, Claude, Gemini, DeepSeek, or internal LLMs) alongside their rough, unstructured notes. The prompt instructs the chatbot to output a flawless, standardized RecruitSync Markdown table or JSON payload.
2. **Universal Bulk TXT / MD Intake & Instant Auto-Scheduler:** The recruiter pastes the AI's formatted output back into RecruitSync. The engine auto-detects the structure, validates each candidate, pairs them with the Auto-Scheduler's multi-track conflict resolver, and in **one single click ("Ingest & Auto-Schedule")**, commits all records to Firestore & PostgreSQL, reserves calendar slots, creates Google Meet rooms, and live-syncs across every tab!

---

## 2. Complete End-to-End Workflow

```
[ Messy / Rough Candidate Notes from WhatsApp, Email, Resume, Docs ]
                              │
                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  RecruitSync Master Prompt Generator Tab                     │
  │  • Recruiter clicks: [ 📋 Copy Master AI Prompt ]              │
  └───────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  Any External AI Chatbot (ChatGPT / Claude / Gemini / DeepSeek)│
  │  • Recruiter pastes: Master Prompt + Raw Candidate Notes     │
  │  • External AI outputs: Pristine RecruitSync Markdown or JSON │
  └───────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  RecruitSync Universal Bulk Intake Drawer                     │
  │  • Recruiter pastes the AI output (Markdown / TXT / JSON)     │
  │  • Real-time parser validates emails, timezones, & duplicates │
  │  • Choose: [ Direct Ingest Only ] OR [ Ingest & Auto-Schedule]│
  └───────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  Intelligent Auto-Scheduler Matrix (Multi-Track & Day Window) │
  │  • Select date range, daily PKT operating hours, & tracks     │
  │  • Assigns clash-free slots & balances interviewers           │
  │  • Respects candidate daytime waking hours                    │
  └───────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌───────────────────────────────────────────────────────────────┐
  │  💥 BOOM! 1-Click Atomic Execution & Live Multi-Tab Sync      │
  │  • Firestore Batch write & Heroku PostgreSQL sync             │
  │  • Broadcasts to Calendar, Kanban, Directory, and 3D Globe   │
  │  • Instant Google Meet links generated                        │
  └───────────────────────────────────────────────────────────────┘
```

---

## 3. Component A: The Default Master AI Prompt (Built-in)

The prompt section will contain a production-grade, highly structured system prompt ready to copy with 1 click. Recruiters can optionally adjust preset tags (e.g. Target Position, Default Date Range).

### The Built-in Master Prompt Specification:

```markdown
You are an expert Recruitment Operations Data Engineer. Your task is to extract candidate profiles from messy, unstructured text and convert them into the standardized RecruitSync format.

### RULES & CONSTRAINTS:
1. Extract ALL real candidates found in the input. Do not invent, hallucinate, or fabricate dummy records.
2. For each candidate, determine:
   - Full Name
   - Email (must be valid format; if missing, format as firstName.lastName@placeholder.recruitsync.local)
   - Phone Number (include country code e.g. +92, +1, +44, +971 if identifiable)
   - Location (City, Country)
   - Standard IANA Timezone (e.g. America/New_York, Europe/London, Asia/Dubai, Asia/Karachi, Asia/Kolkata)
   - Job Position / Role
   - Experience / Seniority (e.g., Junior, Mid, Senior, Lead)
   - Original Availability Notes (e.g., "Available weekdays after 2 PM local")
   - Key Skills / AI Summary (1-2 crisp sentences)
   - LinkedIn / GitHub / Portfolio URLs (if present in the text)

3. OUTPUT FORMAT:
Output ONLY a single Markdown Table (or JSON Array if requested) formatted exactly as follows, with no extra conversational preamble or closing banter:

| Name | Email | Phone | City | Country | Timezone | Position | Original Availability | Key Skills / Summary | LinkedIn | GitHub |
|---|---|---|---|---|---|---|---|---|---|---|
| John Doe | john.doe@example.com | +1 555-0199 | New York | United States | America/New_York | Senior Fullstack Engineer | Weekday afternoons | React, Node.js, Cloud architecture | https://linkedin.com/in/johndoe | https://github.com/johndoe |

### RAW CANDIDATE DATA TO PARSE:
{{PASTE_YOUR_ROUGH_DATA_HERE}}
```

---

## 4. Component B: The Universal Multi-Format Parser

The parser embedded in `src/lib/bulk-ai-parser.ts` will support:

1. **Markdown Tables (`.md`):**
   - Automatically identifies headers (`Name`, `Email`, `Phone`, `Timezone`, `Country`, etc.).
   - Handles missing columns gracefully and maps variations (`Role` -> `Position`, `Location` -> `City/Country`).
2. **JSON Arrays (`.json` or raw code blocks):**
   - Extracts JSON arrays even if wrapped inside markdown code fences (````json ... ````).
3. **Key-Value Formatted Text (`.txt`):**
   - Parses blocks separated by blank lines with labels like `Name: ...`, `Email: ...`, `Timezone: ...`.
4. **Tab-Separated / CSV Values:**
   - Supports direct copy-paste from Google Sheets or Excel.

### Parser Safety & Validation Rules:
* **Duplicate Email Detection:** Checks against candidates already saved in Firestore. Alerts the user with a badge ("⚠️ 2 candidates already exist in pipeline").
* **Timezone Normalization:** Maps non-standard abbreviations (e.g. `EST`, `PST`, `GMT`, `GST`, `IST`) to canonical IANA timezones using RecruitSync's `timezone-utils.ts`.
* **Zero Fake Data:** Only genuine extracted rows are parsed. Empty or header-only lines are discarded.

---

## 5. Component C: The "Ingest & Auto-Schedule" 1-Click Execution Drawer

When the recruiter pastes the parsed data into the modal, they are presented with two tabs:

### Tab 1: 📋 Master Prompt & Instructions
* Preview of the Master AI Prompt with syntax highlighting.
* Variable customizers:
  - Default Job Title (e.g. `Senior React Engineer`)
  - Default Interview Window (e.g. `Next Week`)
* Large CTA button: **"Copy Master AI Prompt to Clipboard"** (with instant copy feedback).
* Quick guide: *"Step 1: Copy prompt -> Step 2: Send to ChatGPT/Claude with raw notes -> Step 3: Paste output in Tab 2"*.

### Tab 2: 📥 Paste & Ingest Matrix
* Raw text / markdown paste area with live character and candidate counter.
* **Auto-Parse Engine:**
  - Instantly renders a live preview table with parsed fields, country flags, and validated timezone badges.
  - Highlights any errors (e.g., malformed email or missing name) with inline editing.
* **Integrated Auto-Schedule Bar:**
  - Toggle: **"Auto-Schedule Immediately Upon Import"** (Default: ON).
  - Date Range picker (Start Date to End Date in PKT).
  - Daily Operating Hours (e.g. 11:00 AM – 09:00 PM PKT).
  - Multi-Track selector (Track Alpha, Beta, Gamma, Delta).
  - Interviewer assignment panel (`m.mattiulhasnain@gmail.com`, `mihora.tech@gmail.com`).
  - Daylight timezone protection toggle.
* **The "BOOM" Action Button:**
  - **"🚀 Ingest & Schedule All {N} Candidates"**
  - Performs atomic batch writes to Firestore.
  - Updates PostgreSQL database in background.
  - Broadcasts live sync to all tabs (Calendar, Kanban, Directory, 3D Globe).
  - Closes drawer and optionally transitions directly to Calendar or Directory with newly scheduled slots highlighted!

---

## 6. Technical Architecture & File Plan

| File | Purpose |
|---|---|
| `/AI_BULK_INTAKE_AND_PROMPT_ENGINE_SPEC.md` | Comprehensive architectural specification and documentation. |
| `src/lib/bulk-ai-parser.ts` | Multi-format parser for Markdown tables, JSON, key-value text, and CSV. Normalizes timezones, validates emails, and cleans data. |
| `src/lib/prompt-templates.ts` | Standard system prompts with variables for various recruitment scenarios (General, Tech, High-Volume, Executive). |
| `src/components/AiBulkIntakeModal.tsx` | Full-featured dual-tab modal with Master Prompt Viewer, Paste Area, Live Preview Table, and integrated Auto-Schedule controls. |
| `src/App.tsx` | Header navigation button ("🧠 AI Bulk Ingest & Prompt"), live sync integration, and modal activation. |

---

## 7. Key Benefits

1. **100% Tool Agnostic:** Recruiters can use free ChatGPT, Claude, Gemini, DeepSeek, or any company-approved AI tool.
2. **Zero Manual Data Entry:** Converts unstructured chats, emails, and notes into fully populated database records in seconds.
3. **Instant Calendar Optimization:** Combines bulk candidate creation with our multi-track, daylight-aware auto-scheduling engine in a single atomic step.
4. **Live Synchronization:** Real-time dual-DB sync across Firestore and Heroku PostgreSQL, with live updates on every open browser tab.
5. **Zero Fake Data Integrity:** Every imported candidate is strictly parsed from the recruiter's provided input.
