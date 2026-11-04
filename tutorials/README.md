# Tutorial videos

Scripted, re-recordable how-to videos for the **Client** and **Employee** journeys.
Each journey is a 1–2 minute `.webm` with a title card, on-screen captions and a
visible cursor, ready for voice-over in Clipchamp / Descript.

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
npm run seed           # demo client + employee, team, project, 2 tickets, a chat
npm run record         # all videos  → tutorials/videos/*.webm
npm run record:client  # or just one role
node record.js employee-03   # or a single journey
```

Always run **cleanup → seed → record** together. The journeys change the data (status changes, comments),
so a second recording without re-seeding will look different.

Options (env vars): `TUT_HEADLESS=false` to watch the browser, `TUT_PACE=0.7` for a faster pace,
`TUT_APP_URL` / `TUT_API_URL` to point at another environment.

If a journey fails, you get `videos/<id>.FAILED.png` and `.FAILED.webm` showing where it stopped.

## Shared database: what gets created and removed

The demo uses the **shared** database, so everything is tied to two fixed accounts:

- `demo.client` / Sarah Malik (Client role) and `demo.employee` / Ali Raza (Employee role), password `DemoPass#2026`
- Team **Tutorial Demo Team** and project **Tutorial Demo – Website Revamp**
- Tickets whose subject starts with **[Demo]**

`npm run cleanup` hard-deletes those tickets plus their comments and history, the demo users' timesheets, chats, reviews/shoutouts,
requests and notifications (including other users' notifications about `[Demo]` tickets).
`npm run cleanup -- --all` also removes the two accounts, the team and the project. Run it when you finish.

## Adding voice-over

See [NARRATION.md](NARRATION.md) for a voice-over script per video that matches the on-screen captions.
In Clipchamp: import the `.webm` → *Record & create → Text to speech* (or record your own voice) →
*Auto captions* if you want them burned in → export 1080p MP4.
