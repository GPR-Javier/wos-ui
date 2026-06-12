import type { Metadata } from "next"
import { AppearanceSection } from "@/components/dashboard/settings/appearance"

export const metadata: Metadata = { title: "Appearance" }

export default function SettingsAppearancePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <AppearanceSection />
    </div>
  )
}
