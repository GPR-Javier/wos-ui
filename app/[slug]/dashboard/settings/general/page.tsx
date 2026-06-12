import type { Metadata } from "next"
import { GeneralSection } from "@/components/dashboard/settings/general"

export const metadata: Metadata = { title: "General Settings" }

export default function SettingsGeneralPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <GeneralSection />
    </div>
  )
}
