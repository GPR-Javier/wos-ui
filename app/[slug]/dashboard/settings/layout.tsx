import { SettingsTabs } from "@/components/custom/settings-tabs"

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      <SettingsTabs />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}
