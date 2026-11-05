// Central settings for tutorial recording. Override any value with an env var.
export const config = {
  apiUrl: process.env.TUT_API_URL || "http://localhost:4000/api",
  appUrl: process.env.TUT_APP_URL || "http://localhost:5173",
  browserPath:
    process.env.TUT_BROWSER ||
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",

  admin: {
    identifier: process.env.TUT_ADMIN_USER || "admin",
    password: process.env.TUT_ADMIN_PASS || "admin123",
  },

  // Persistent demo fixtures. Names/emails are fixed so re-seeding reuses them;
  // `npm run cleanup` hard-deletes everything tied to these accounts.
  demo: {
    password: "DemoPass#2026",
    tempPassword: "TempPass#2026",
    client: {
      email: "demo.client@tutorial.local",
      username: "demo.client",
      fullname: "Sarah Malik",
      title: "Product Owner (Client)",
    },
    employee: {
      email: "demo.employee@tutorial.local",
      username: "demo.employee",
      fullname: "Ali Raza",
      title: "Software Engineer",
    },
    // Staff roles. All demo accounts use @tutorial.local, which is how cleanup finds them.
    lead: {
      email: "demo.lead@tutorial.local",
      username: "demo.lead",
      fullname: "Usman Tariq",
      title: "Team Lead",
    },
    qa: {
      email: "demo.qa@tutorial.local",
      username: "demo.qa",
      fullname: "Hina Javed",
      title: "QA Engineer",
    },
    manager: {
      email: "demo.manager@tutorial.local",
      username: "demo.manager",
      fullname: "Bilal Ahmed",
      title: "Project Manager",
    },
    hr: {
      email: "demo.hr@tutorial.local",
      username: "demo.hr",
      fullname: "Ayesha Khan",
      title: "HR Executive",
    },
    // Created on camera in the admin video (and removed by cleanup).
    newHire: {
      email: "demo.newhire@tutorial.local",
      username: "demo.newhire",
      fullname: "Zara Hussain",
      title: "Frontend Developer",
    },
    candidate: {
      name: "Omar Siddiqui",
      email: "omar.candidate@tutorial.local",
      position: "Backend Developer",
    },
    teamName: "Tutorial Demo Team",
    projectName: "Tutorial Demo – Website Revamp",
    ticketPrefix: "[Demo]",
  },

  // Video framing
  viewport: { width: 1600, height: 900 },
  // Global speed multiplier for all pauses (1 = normal, 0.5 = faster takes)
  pace: Number(process.env.TUT_PACE || 1),
  headless: process.env.TUT_HEADLESS !== "false",
};
