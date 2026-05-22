"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Edit01Icon,
  Clock01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/custom/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { SchedulePolicyModal } from "@/components/custom/schedule-policy-modal"
import { PolicyHistoryModal } from "@/components/custom/policy-history-modal"
import { useResolveForUser } from "@/hooks/use-schedule-policy"
import type { PolicyScope } from "@/lib/schedule-policy-api"

const SCOPE_LABEL: Record<PolicyScope, string> = {
  ORG: "Organization default",
  USER_ROLE: "Role override",
  USER: "User override",
}

const SCOPE_VARIANT: Record<PolicyScope, "blue" | "purple" | "green"> = {
  ORG: "blue",
  USER_ROLE: "purple",
  USER: "green",
}

interface Props {
  employeeId: number
  employeeName: string
}

export function PolicyTab({ employeeId, employeeName }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const q = useResolveForUser(employeeId)

  if (q.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (q.isError || !q.data) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
        <HugeiconsIcon icon={Alert01Icon} size={13} strokeWidth={2} />
        Could not load schedule policy for this employee.
      </div>
    )
  }

  const { payload: p, sourceScope } = q.data
  const hasUserOverride = sourceScope === "USER"

  return (
    <div className="space-y-4">
      {/* Source banner */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <StatusBadge variant={SCOPE_VARIANT[sourceScope]} dot={false}>
            {SCOPE_LABEL[sourceScope]}
          </StatusBadge>
          <p className="text-[12px] text-muted-foreground">
            {hasUserOverride
              ? `${employeeName} has a user-level override. Resolution stops here.`
              : `Inherited from ${sourceScope === "ORG" ? "organization default" : "role policy"}. Edit to attach a user-specific override.`}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setHistoryOpen(true)}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
            History
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setEditOpen(true)}
            className="gap-1.5"
          >
            <HugeiconsIcon icon={Edit01Icon} size={12} strokeWidth={2} />
            {hasUserOverride ? "Edit user override" : "Add user override"}
          </Button>
        </div>
      </div>

      {/* Policy details grid */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="mb-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          Effective schedule
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px] md:grid-cols-4">
          <Field
            label="Clock-in window"
            value={`${p.earliestClockIn ?? "—"} – ${p.latestClockIn ?? "—"}`}
            sub={`Grace ${p.lateGraceMins ?? 0}m`}
          />
          <Field
            label="Clock-out window"
            value={`${p.earliestClockOut ?? "—"} – ${p.latestClockOut ?? "—"}`}
          />
          <Field
            label="Required hours"
            value={p.requiredHours != null ? `${p.requiredHours}h` : "—"}
            sub={`Undertime grace ${p.undertimeGraceMins ?? 0}m`}
            emphasize
          />
          <Field
            label="Workdays"
            value={(p.workdays ?? []).join(", ") || "—"}
            sub={p.timezone ?? undefined}
          />
        </div>
      </div>

      {editOpen && (
        <SchedulePolicyModal
          open
          scope="USER"
          scopeRef={employeeId}
          scopeLabel={employeeName}
          onClose={() => {
            setEditOpen(false)
            q.refetch()
          }}
        />
      )}
      {historyOpen && (
        <PolicyHistoryModal
          open
          scope="USER"
          scopeRef={employeeId}
          scopeLabel={employeeName}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  )
}

function Field({
  label,
  value,
  sub,
  emphasize,
}: {
  label: string
  value: string
  sub?: string
  emphasize?: boolean
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={
          emphasize
            ? "mt-0.5 text-[14px] font-semibold tabular-nums"
            : "mt-0.5 tabular-nums"
        }
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  )
}
