import type { Metadata } from "next"
import { NotificationsSection } from "@/components/dashboard/settings/notifications"

export const metadata: Metadata = { title: "Notifications" }

export default function SettingsNotificationsPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <NotificationsSection />
    </div>
  )
}
