"use client"

import { useMemo } from "react"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SchedulePoliciesSection } from "@/components/dashboard/admin/schedule-policies"
import { AttendanceConfigSection } from "@/components/dashboard/admin/attendance-config"
import { useAuthStore } from "@/store/auth-store"

interface PlaceholderItem {
  label: string
  value: string
  tag?: string
}

interface PlaceholderSectionProps {
  title: string
  description: string
  items: PlaceholderItem[]
}

function PlaceholderSection({
  title,
  description,
  items,
}: PlaceholderSectionProps) {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
        </div>
        <Button size="xs" variant="outline" disabled>
          Edit
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-[13px]"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.value}</span>
              {item.tag && (
                <StatusBadge variant="amber" dot={false}>
                  {item.tag}
                </StatusBadge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ConfigSection() {
  const canViewSchedulePolicy = useAuthStore((s) =>
    s.authorities.includes("SCHEDULE_POLICY:VIEW")
  )

  // The schedule-policy tab is the only one wired up to real data today; gate it
  // behind the authority and make it the default when present so admins land on it.
  const defaultTab = useMemo(
    () => (canViewSchedulePolicy ? "schedule" : "attendance"),
    [canViewSchedulePolicy]
  )

  return (
    <Tabs defaultValue={defaultTab} className="gap-6">
      <TabsList variant="line" className="border-b border-border">
        {canViewSchedulePolicy && (
          <TabsTrigger value="schedule">Schedule policy</TabsTrigger>
        )}
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="payroll">Payroll</TabsTrigger>
        <TabsTrigger value="leave">Leave</TabsTrigger>
      </TabsList>

      {canViewSchedulePolicy && (
        <TabsContent value="schedule" className="space-y-4">
          <div>
            <p className="text-[13px] font-semibold">Schedule policy</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Set the clock-in window, late grace, required hours, and workdays.
              Saves create a new immutable version — past attendance keeps its
              original snapshot and is never reclassified.
            </p>
          </div>
          <SchedulePoliciesSection />
        </TabsContent>
      )}

      <TabsContent value="attendance">
        <AttendanceConfigSection />
      </TabsContent>

      <TabsContent value="payroll">
        <PlaceholderSection
          title="Payroll settings"
          description="Coming soon."
          items={[
            { label: "Overtime multiplier", value: "1.30×", tag: "Modified" },
            { label: "Pay period", value: "Monthly (last business day)" },
            { label: "Cut-off date", value: "25th of each month" },
          ]}
        />
      </TabsContent>

      <TabsContent value="leave">
        <PlaceholderSection
          title="Leave settings"
          description="Coming soon."
          items={[
            { label: "Vacation leave accrual", value: "1.25 days/month" },
            { label: "Sick leave accrual", value: "1.25 days/month" },
            { label: "Leave carry-over", value: "10 days max" },
          ]}
        />
      </TabsContent>
    </Tabs>
  )
}
