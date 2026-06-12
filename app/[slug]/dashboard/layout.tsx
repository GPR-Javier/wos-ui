import { Suspense } from "react"
import { Sidebar } from "@/components/custom/sidebar"
import { Topbar } from "@/components/custom/topbar"
import { SessionWarningModal } from "@/components/custom/session-warning-modal"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen gap-4 overflow-hidden bg-background p-4">
      <Suspense>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <Suspense>
          <Topbar />
        </Suspense>
        <main className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-card shadow-sm">
          <Suspense>{children}</Suspense>
        </main>
      </div>
      <SessionWarningModal />
    </div>
  )
}
