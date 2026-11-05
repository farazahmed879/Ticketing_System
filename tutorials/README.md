# Tutorial videos

Scripted, re-recordable how-to videos for every role: **Client**, **Employee**, **Team Lead**, **QA**,
**Project Manager**, **HR** and **Administrator**.
Each journey is a 1–2 minute video with a title card, on-screen captions, a visible cursor
and a spoken voice-over, exported as `.mp4`.

| Video | Covers |
|---|---|
| `client-01-login-and-dashboard` | Login, dashboard, sidebar tour |
| `client-02-raise-a-ticket` | Create Ticket: subject, project, type, priority, description |
| `client-03-track-and-reply` | Board columns, ticket status, replying to the team |
| `client-04-messages` | Chatting with the assigned employee |
| `client-05-reviews` | Posting a review |
| `employee-01-login-and-dashboard` | Login, dashboard, sidebar tour |
| `employee-02-working-on-tickets` | Board, moving to In Process, Update Ticket, public vs internal comments |
| `employee-03-timesheet` | Day type, tasks, project/ticket, hours, Save Timesheet, leave rules |
| `employee-04-teams-projects-requests` | Teams, Projects, Requests, Interviews |
| `employee-05-messages-and-shoutouts` | Replying to a client, creating a shoutout |
| `lead-01-team-board-and-assigning` | Team board, Unassigned column, assigning a ticket to a teammate |
| `lead-02-approving-finished-work` | Done column, reviewing and moving a ticket to Approved |
| `lead-03-team-leave-requests` | Approving a team member's leave request |
| `lead-04-team-group-chat` | Creating a group chat for the team |
| `qa-01-your-qa-board` | QA board: Done = waiting for you, only Approved is unlocked |
| `qa-02-testing-and-feedback` | Reading the ticket, internal notes for the developer, History |
| `qa-03-approving-a-ticket` | Status → Approved, Update Ticket |
| `manager-01-your-projects` | Project list and detail: manager, teams, clients, Developer Hours |
| `manager-02-assigning-tickets` | Assignee and QA Assignee on a new ticket |
| `manager-03-approving-timesheets` | Review Pending: eye/Approve, quick approve, Manager Approved tab |
| `manager-04-leave-requests` | Approving a leave request |
| `hr-01-final-timesheet-approval` | HR approval of work and leave days (leave deducted from balance) |
| `hr-02-adding-a-candidate` | Add Candidate form |
| `hr-03-scheduling-an-interview` | Schedule Interview: candidate, date and time, panel |
| `hr-04-employees-and-leave-balance` | Edit User: Leave Balance and Is Team Lead |
| `admin-01-adding-users` | Add New User (two-step form), System Role |
| `admin-02-roles-and-permissions` | Board Transitions and Permissions Matrix (view only) |
| `admin-03-teams-and-projects` | Team Lead / members, Project Manager / clients / teams (view only) |
| `admin-04-system-settings` | Ticket and notification settings (view only) |

## One-time setup

```bash
cd backend && npm install          # needs backend/.env (DATABASE_URL, JWT secret…)
cd ../frontend && npm install
cd ../tutorials && npm run setup   # playwright-core + its ffmpeg (for video)
```

Uses the system Microsoft Edge, so no browser download is needed (`TUT_BROWSER` overrides the path).

## Recording

1. Start the app: `npm run dev` in `backend/` (port 4000) and `frontend/` (port 5173).
2. In `tutorials/`:

```bash
npm run cleanup        # wipe previous demo tickets/timesheets/chats (keeps demo accounts)
npm run seed           # demo accounts for every role, team, project, tickets, timesheets, requests, a candidate
npm run record         # all videos  → tutorials/videos/webm-videos/*.webm
npm run record:client  # or just one role
node record.js employee-03   # or a single journey
```

Always run **cleanup → seed → record** together. Record the roles in this order after one seed: lead, qa,
manager, hr, admin (HR's final timesheet approval follows the manager's). The journeys change the data (status changes, comments),
so a second recording without re-seeding will look different.

Options (env vars): `TUT_HEADLESS=false` to watch the browser, `TUT_PACE=0.7` for a faster pace,
`TUT_APP_URL` / `TUT_API_URL` to point at another environment.

If a journey fails, you get `videos/<id>.FAILED.png` and `videos/webm-videos/<id>.FAILED.webm` showing where it stopped.

### Privacy on camera
Manager, HR and admin screens list real company data. Those journeys call `s.privacy([...])`, which hides
every table row (and, where needed, dropdown option) that doesn't mention a demo name or email, and load
list pages behind a title card (`goto(route, { quick: true })` + `titleCard(..., { during })`), so real
people's names never reach the video. Check the storyboard of any new admin/HR/manager journey before sharing it.

## Shared database: what gets created and removed

The demo uses the **shared** database, so everything is tied to fixed demo accounts. All use the
reserved `@tutorial.local` domain, which is how cleanup finds them (never by name or subject):

- `demo.client` Sarah Malik (Client), `demo.employee` Ali Raza (Employee), `demo.lead` Usman Tariq (Employee + team lead),
  `demo.qa` Hina Javed (QA), `demo.manager` Bilal Ahmed (Manager), `demo.hr` Ayesha Khan (HR). Password `DemoPass#2026`.
- `demo.newhire` Zara Hussain, created on camera by the admin video.
- Candidates `*@tutorial.local` (Fatima Noor, Omar Siddiqui) and their interviews.
- Team **Tutorial Demo Team** and project **Tutorial Demo – Website Revamp**.

The admin videos use the real `admin` account (`config.admin`); they only *show* roles and settings, never save them.

`npm run cleanup` removes the demo users' tickets (soft-deleted, to keep ticket numbering intact), comments, history,
timesheets, chats, shoutouts, requests, demo candidates and interviews, and notifications, including the ones sent to
real admins about demo requests, tickets and interviews. Add `--dry-run` to see what it would remove.
`npm run cleanup -- --all` also removes the demo accounts, team and project. **Run it when you finish**: the demo
manager and HR accounts have real permissions on the shared database and a known password.

## Voice-over & MP4

```bash
npm run voiceover            # every videos/webm-videos/*.webm → videos/mp4-videos/*.mp4 with narration
node voiceover.js client-02  # or just one
```

The narration reads each on-screen caption and title card aloud using a Microsoft Edge neural voice
(`msedge-tts`, needs internet; clips are cached in `videos/.tts/`), then mixes it in and encodes
H.264/AAC MP4 with the bundled `ffmpeg-static`. If a line is longer than the gap before the next caption,
the video holds that frame until the line ends, so nothing overlaps.

- `record.js` writes `videos/<id>.cues.json` with the exact time each caption appeared, and it keeps each
  caption on screen until its narration has finished. New recordings therefore need little or no freezing.
- Older takes without a cue sheet are timed from the storyboard screenshot times plus title-card detection.
- Options: `TUT_VOICE_NAME` (default `en-US-AriaNeural`, e.g. `en-US-GuyNeural`), `TUT_VOICE_RATE` (e.g. `+10%`),
  `TUT_VOICE=false` to record without waiting for narration.

[NARRATION.md](NARRATION.md) has a longer, hand-written script if you'd rather record your own voice.
