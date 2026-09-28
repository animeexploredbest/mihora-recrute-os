# 📅 RecruitSync - Smart Candidate Interview Scheduler & Pipeline

A production-grade, collaborative recruitment management platform and interview scheduling web application. Built for recruiters, talent acquisition teams, and hiring managers to manage global candidate pipelines, prevent schedule overlaps, synchronize with **Google Calendar & Google Meet**, dispatch invites via **Titan Mail SMTP** & **WhatsApp**, and leverage **Google Gemini AI** for automatic resume analysis.

---

## 🌟 Key Features

### 1. 🌐 Global Timezone Management & Conflict Detection
- **Auto-Conversion**: Converts candidate local time into Pakistan Standard Time (PKT / UTC+5), UTC, EST, GMT, and recruiter local time.
- **Overlap Prevention**: Intelligent conflict detection algorithm warns recruiters if another interview is already scheduled within a configurable buffer window.
- **Visual World Map**: Interactive geographical distribution map showcasing candidate locations around the world.

### 2. 🗓️ Live Google Calendar & Google Meet Integration
- **Direct 2-Way Sync**: Connects directly to Google Calendar API (v3) using user-authenticated Google OAuth 2.0.
- **Auto Meet Links**: Generates official Google Meet conference links with a single click.
- **Live Verification**: Verifies primary calendar connection and displays calendar timezone in real time.
- **Auto-Update & Deletion**: Modifying or removing scheduled interviews automatically syncs with the recruiter's Google Calendar.

### 3. ✉️ Multi-Channel Interview Invitations
- **Titan Mail SMTP**: Send branded, professional HTML interview invitations directly from your company domain (e.g., `hr@mihora.tech`).
- **Calendar Attachment (.ICS)**: Automatically attaches universal `.ics` calendar invitation files so candidates can add events to Apple Calendar, Outlook, or Google Calendar with one click.
- **Google Workspace Gmail OAuth**: Option to dispatch invitations directly from the recruiter's logged-in Gmail account.
- **One-Click WhatsApp Invites**: Formats pre-written, personalized WhatsApp interview messages ready to send via WhatsApp Web or mobile app.

### 4. 🤖 AI-Powered Resume Parser & Question Generator (Google Gemini 2.5 Flash)
- **Multi-Format Resume Upload**: Drag-and-drop or upload PDF, DOCX, or paste raw resume text.
- **Automatic Field Extraction**: Extracts candidate name, email, phone, location, skills, and experience summary in seconds.
- **AI Match Rating**: Evaluates candidate fit and provides a technical rating.
- **Custom Interview Questions**: Generates 5 tailored, role-specific technical and behavioral interview questions based on the candidate's resume.

### 5. 👥 Real-Time Team Collaboration & Live Presence
- **Live Pipeline Updates**: Uses Firebase Firestore real-time snapshot listeners so candidate updates reflect across all recruiters instantly without page reloads.
- **Active Recruiter Badges**: Real-time presence indicators show who is online, idle, or reviewing a specific candidate.
- **Audit Log Trail**: Every status change, schedule update, email dispatched, and note added is tracked in a candidate timeline.

### 6. 📊 Structured Interview Scorecards & Hiring Rounds
- **Evaluation Criteria**: Rate candidates (1–5 scale) on Technical Competency, Communication, and Problem Solving.
- **Hiring Decisions**: Choose from *Strong Hire*, *Hire*, *On Hold*, or *Reject*.
- **Pipeline Stages**: Move candidates smoothly through *Screening*, *Technical Round 1*, *Technical Round 2*, *Management*, *Offer*, and *Hired*.

### 7. 💾 Hybrid Storage & Export Capabilities
- **Google Cloud Firestore**: Real-time collaborative document database.
- **PostgreSQL / Heroku Postgres**: Built-in full relational schema support with `/api/candidates` endpoints.
- **Data Export & Import**: Export full candidate pipeline to **CSV** or backup/restore via **JSON**.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion (Framer Motion) |
| **Maps & Visualization** | D3-Geo, TopoJSON, World Atlas |
| **Backend API** | Node.js, Express 4, TypeScript (`tsx`) |
| **Artificial Intelligence** | Google GenAI SDK (`@google/genai`), Gemini 2.5 Flash |
| **Authentication & Realtime** | Firebase Auth (Google Sign-In), Cloud Firestore |
| **Calendar & Email** | Google Calendar API v3, Google OAuth 2.0, Nodemailer (Titan Mail SMTP) |
| **Relational Database** | PostgreSQL (`pg`) with automatic table migrations |
| **Build Tooling** | Vite 6, ESBuild |

---

## 📁 Directory Structure

```text
├── .env.example                  # Environment variable reference
├── firebase-applet-config.json    # Firebase web configuration & database ID
├── firebase-blueprint.json        # Data models and Firestore collection schema
├── firestore.rules               # Firestore security & access control rules
├── index.html                    # Application HTML entry point
├── metadata.json                 # Project capabilities & permissions
├── package.json                  # Dependencies & execution scripts
├── server.ts                     # Full-stack Express backend & API endpoints
├── vite.config.ts                # Vite configuration
├── src/
│   ├── App.tsx                   # Main recruitment dashboard and views
│   ├── main.tsx                  # React application entry point
│   ├── types.ts                  # TypeScript interfaces and enum definitions
│   ├── components/
│   │   ├── CandidateCard.tsx     # Candidate pipeline card with quick actions
│   │   ├── CandidateModal.tsx    # Add / Edit modal with AI resume parser
│   │   ├── PresenceBar.tsx       # Live active team member presence bar
│   │   ├── ScorecardModal.tsx    # Structured candidate interview evaluation
│   │   ├── SettingsModal.tsx     # Recruiter email templates & defaults
│   │   ├── Toast.tsx             # Notification toast component
│   │   └── WorldMap.tsx          # D3 interactive candidate location map
│   ├── lib/
│   │   ├── auth.ts               # Firebase Auth helpers & Google Sign-In
│   │   ├── calendar-verifier.ts  # Google Calendar token check & permissions test
│   │   ├── conflict-detector.ts  # Schedule overlap & conflict detection logic
│   │   ├── date-utils.ts         # Date formatting & PKT conversions
│   │   ├── export-utils.ts       # CSV & JSON pipeline export/import utilities
│   │   ├── firebase.ts           # Firebase SDK initialization with long-polling
│   │   ├── firebase-operations.ts# Firestore CRUD, real-time listeners & presence
│   │   ├── geo-utils.ts          # Country coordinates & geolocation lookup
│   │   ├── google-api.ts         # Google Calendar & Meet event management
│   │   ├── heroku-db.ts          # Client bridge for relational backend endpoints
│   │   ├── ics-utils.ts          # iCalendar (.ics) invite generator
│   │   ├── theme.ts              # Theme constants & color helpers
│   │   ├── timezone-utils.ts     # Timezone offset calculation & display labels
│   │   └── whatsapp-formatter.ts # WhatsApp invite deep-link generator
│   └── server/
│       └── db.ts                 # PostgreSQL database pool & table migrations
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm**: v9.0.0 or higher
- A **Google Cloud Project** with Calendar API enabled (optional, for Calendar integration)
- A **Gemini API Key** (for AI Resume Parsing)

### 2. Installation
Clone the repository and install the project dependencies:

```bash
git clone <repository-url>
cd recruiter-scheduler
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

```env
# Gemini AI (for resume parsing & question generation)
GEMINI_API_KEY="your-gemini-api-key"

# Application Base URL
APP_URL="http://localhost:3000"

# Titan Mail SMTP Settings (for dispatching interview emails)
TITAN_EMAIL="hr@yourdomain.com"
TITAN_PASSWORD="your-titan-mailbox-password"

# Optional: Heroku / PostgreSQL Connection String
DATABASE_URL="postgres://username:password@localhost:5432/scheduler_db"
```

### 4. Running the Development Server
Start the development server (runs Express backend + Vite on port 3000):

```bash
npm run dev
```

Visit `http://localhost:3000` in your web browser.

---

## ⚙️ Core Integrations Guide

### A. Google Calendar & Google Meet
1. In the app header, click **"Connect Calendar"** or sign in with Google.
2. Grant the requested Google Calendar and Meet scopes.
3. Once authenticated:
   - Creating an interview with a date/time automatically creates an event on your **Google Calendar**.
   - A **Google Meet** video link is generated and attached to the candidate card and emails.
   - Deleting or rescheduling the interview in the app automatically updates Google Calendar.

### B. Titan Mail SMTP & .ICS Invitations
- When you click **"Send Invite"** on any candidate card, the system sends a formatted HTML email containing:
  - Job Position & Candidate Name
  - Scheduled Date & Time in candidate's local timezone + PKT
  - Google Meet link button
  - Attached standard `.ics` file for calendar auto-import
- Emails are delivered via the authenticated Titan Mail SMTP server without third-party tracking.

### C. WhatsApp Quick Invites
- Click the **WhatsApp** icon on any candidate card.
- A pre-formatted, professional greeting with interview date, time, and Google Meet URL opens directly in WhatsApp for quick candidate confirmation.

---

## 📡 Backend API Endpoints

The full-stack Express server (`server.ts`) exposes the following endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/api/candidates` | `GET`, `POST` | Retrieve or create candidates in the PostgreSQL database |
| `/api/candidates/:id` | `GET`, `PUT`, `DELETE` | Retrieve, update, or remove a specific candidate |
| `/api/candidates/bulk` | `POST` | Bulk import multiple candidates |
| `/api/send-email` | `POST` | Send HTML interview invitation with `.ics` attachment via Titan SMTP |
| `/api/analyze-resume` | `POST` | Parse resume document/text using Gemini 2.5 Flash |
| `/api/generate-questions` | `POST` | Generate 5 custom interview questions via Gemini AI |
| `/api/db/status` | `GET` | PostgreSQL health status and table diagnostics |

---

## 🔒 Security & Firestore Rules

- **Access Rules**: `firestore.rules` enforces that only authenticated team members can access candidate data, candidate activity trails, and recruiter user settings.
- **Validation**: Incoming candidate records are strictly validated for required fields (`name`, `email`, `status`, `suggestedPktTime`).
- **Resilience**: Firestore uses long-polling transport (`experimentalForceLongPolling`) to prevent WebSocket termination in proxied or iframe environments.

---

## 📦 Production Build & Deployment

To compile the application for production:

```bash
npm run build
```

This compiles:
1. The frontend assets to `/dist` via Vite.
2. The server script to `/dist/server.cjs` via ESBuild.

To start the production server:

```bash
npm start
```

### Heroku Deployment
The app is pre-configured with `engines`, dynamic `process.env.PORT`, and Heroku Postgres auto-initialization. Simply link your repository to Heroku, provision the **Heroku Postgres** add-on, and add your config variables.

---

## 🚀 Multi-User Concurrent Interview System (Architecture & Roadmap)

RecruitSync includes a comprehensive architectural design and implementation plan for **Multi-Track / Concurrent Interviews** — allowing multiple interviewers to hold interviews in the same time slot across separate tracks/rooms with live real-time sync across all recruiters.

📖 **Full Blueprint & Specification**: See [`MULTI_USER_CONCURRENT_INTERVIEWS_PLAN.md`](./MULTI_USER_CONCURRENT_INTERVIEWS_PLAN.md) for data schemas, conflict evaluation rules, UI/UX designs, and phased rollout roadmap.

---

## 📄 License
This project is proprietary and built for high-performance recruitment workflows.
