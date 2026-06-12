import type { Metadata } from "next"
import { SecuritySection } from "@/components/dashboard/settings/security"

export const metadata: Metadata = { title: "Security" }

export default function SettingsSecurityPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <SecuritySection />
    </div>
  )
}
