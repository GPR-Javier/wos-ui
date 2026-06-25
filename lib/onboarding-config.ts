import type { Step, Tour } from "nextstepjs"
import type { Role } from "@/lib/types"

// ── Onboarding tiers ──────────────────────────────────────────────────────────
// Three distinct flows. The same screen key (e.g. "dashboard") can appear in more
// than one tier with different content; the backend only stores the bare screen key
// (scoped per role assignment), so the active role implies which tier's content to show.

export type OnboardingTier = "applicant" | "employee" | "admin"

/** Maps the sidebar/dashboard role key to an onboarding tier. Non-admin roles share the employee flow. */
export function tierFromRole(role: Role): OnboardingTier {
  if (role === "applicant") return "applicant"
  if (role === "admin") return "admin"
  return "employee"
}

// ── Screen definitions ────────────────────────────────────────────────────────

export interface ScreenOnboardingDef {
  /** Authority required for this screen's tour to run; null = always available for the tier. */
  authority: string | null
  steps: Step[]
}

/**
 * The tour id mounted into NextStep must be globally unique across tiers, so we namespace
 * it as `${tier}:${screenKey}`. The API, however, only deals in the bare screen key.
 */
export function tourId(tier: OnboardingTier, screenKey: string): string {
  return `${tier}:${screenKey}`
}

export function screenKeyOf(tourIdValue: string): string {
  return tourIdValue.includes(":") ? tourIdValue.split(":")[1] : tourIdValue
}

const SCREENS: Record<OnboardingTier, Record<string, ScreenOnboardingDef>> = {
  applicant: {
    dashboard: {
      authority: null,
      steps: [
        {
          icon: "👋",
          title: "Welcome to WorkOS",
          content:
            "This is your applicant portal. We'll give you a quick tour of each page the first time you open it.",
          selector: '[data-tour="sidebar-nav"]',
          side: "right",
          showSkip: true,
          showControls: true,
        },
        {
          icon: "🧭",
          title: "Find your way around",
          content:
            "Use the sidebar to browse jobs, track applications, view interviews, and review offers.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    careers: {
      authority: "CAREERS:VIEW_JOBS",
      steps: [
        {
          icon: "💼",
          title: "Browse open roles",
          content:
            "Every published job posting shows up here. Let's walk through how to find and apply to one.",
          showSkip: true,
          showControls: true,
        },
        {
          icon: "🔍",
          title: "Search",
          content:
            "Type a job title, department, or location to quickly find roles that fit you.",
          selector: '[data-tour="careers-search"]',
          side: "bottom",
          showSkip: true,
          showControls: true,
        },
        {
          icon: "🧰",
          title: "Filter",
          content:
            "Or narrow the list by department and job type using these filters.",
          selector: '[data-tour="careers-filters"]',
          side: "bottom-left",
          showSkip: true,
          showControls: true,
        },
        {
          icon: "🚀",
          title: "Apply",
          content:
            "Found a match? Click Apply on any role — the application form will open and the tour continues there.",
          selector: '[data-tour="careers-apply"]',
          side: "left",
          showSkip: true,
          // No "Next": the only way forward is clicking the highlighted Apply button,
          // which opens the modal and advances the tour to the form step.
          showControls: false,
        },
        {
          icon: "📝",
          title: "The application form",
          content:
            "Your name and email are prefilled. Add a short message and upload your resume (PDF or DOC, up to 5 MB), then Submit. You can track every application under My Applications.",
          selector: '[data-tour="apply-submit"]',
          side: "top",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    "my-applications": {
      authority: "MY_APPLICATIONS:VIEW_OWN_APPLICATIONS",
      steps: [
        {
          icon: "📄",
          title: "Track your applications",
          content:
            "Once you apply, follow each application's status here — from submitted to decision.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    interviews: {
      authority: "APPLICANT_INTERVIEWS:VIEW_INTERVIEWS",
      steps: [
        {
          icon: "🗓️",
          title: "Your interviews",
          content:
            "Scheduled interviews appear here with their date, time, and joining details.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    offers: {
      authority: "APPLICANT_OFFERS:VIEW_OFFERS",
      steps: [
        {
          icon: "🎉",
          title: "Review your offers",
          content:
            "When a company extends an offer, you'll find it here to review, accept, or decline.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
  },

  employee: {
    dashboard: {
      authority: null,
      steps: [
        {
          icon: "👋",
          title: "Welcome aboard",
          content:
            "This is your employee dashboard. We'll point out the key areas the first time you visit each page.",
          selector: '[data-tour="sidebar-nav"]',
          side: "right",
          showSkip: true,
          showControls: true,
        },
        {
          icon: "🧭",
          title: "Self-service tools",
          content:
            "The sidebar gives you attendance, leave, payslips, and requests — everything you need day to day.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    dtr: {
      authority: "DTR:VIEW_ATTENDANCE",
      steps: [
        {
          icon: "⏰",
          title: "My attendance",
          content: "Clock in and out and review your daily time records here.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    request: {
      authority: "LEAVE:VIEW_OWN_LEAVE",
      steps: [
        {
          icon: "🌴",
          title: "File a leave",
          content:
            "Submit leave requests and track their approval status from this page.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    payroll: {
      authority: "PAYROLL:VIEW_PAYSLIP",
      steps: [
        {
          icon: "💸",
          title: "My payslip",
          content:
            "Your payslips land here each cutoff — view and download them anytime.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
  },

  admin: {
    dashboard: {
      authority: null,
      steps: [
        {
          icon: "🛠️",
          title: "Admin dashboard",
          content:
            "You have elevated access. We'll highlight the admin areas as you open each one.",
          selector: '[data-tour="sidebar-nav"]',
          side: "right",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    config: {
      authority: "SCHEDULE_POLICY:VIEW",
      steps: [
        {
          icon: "⚙️",
          title: "Configuration",
          content:
            "Set up schedule policies, salary grades, positions, and payroll defaults here.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    roles: {
      authority: "ROLES_AND_PERMISSIONS:VIEW_ROLES",
      steps: [
        {
          icon: "🔐",
          title: "Roles & permissions",
          content:
            "Define roles and toggle exactly which functionalities each one grants.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
    recruitment: {
      authority: "RECRUITMENT:VIEW_JOB_POSTINGS",
      steps: [
        {
          icon: "📢",
          title: "Recruitment",
          content:
            "Create and manage job postings and review the applicants coming in.",
          showSkip: true,
          showControls: true,
        },
      ],
    },
  },
}

export function getScreenDef(
  tier: OnboardingTier,
  screenKey: string
): ScreenOnboardingDef | undefined {
  return SCREENS[tier]?.[screenKey]
}

/** Flattens every tier/screen into the unique-id Tour[] that NextStep mounts. */
export function buildAllTours(): Tour[] {
  const tours: Tour[] = []
  for (const tier of Object.keys(SCREENS) as OnboardingTier[]) {
    for (const [screenKey, def] of Object.entries(SCREENS[tier])) {
      tours.push({ tour: tourId(tier, screenKey), steps: def.steps })
    }
  }
  return tours
}
