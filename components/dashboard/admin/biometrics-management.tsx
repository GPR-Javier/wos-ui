"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FaceIdIcon,
  Alert01Icon,
  CheckmarkBadge01Icon,
  Search01Icon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/custom/status-badge"
import { EmptyState } from "@/components/custom/empty-state"
import { TableSkeleton } from "@/components/custom/table-skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToastStore } from "@/store/toast-store"
import {
  useFaceEnrollments,
  useResetFaceEnrollment,
} from "@/hooks/use-face-enrollment"
import type { FaceEnrollmentAdminRow } from "@/lib/biometric-api"

/** Format an ISO date-time as a readable local string. */
function fmtDateTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

/**
 * `action-needed` is the only filter that matters day to day: a face match gates this person's
 * punch, but they have no template. "Not enrolled" on its own is mostly noise, since employees
 * whose role has no Face ID never need to enroll.
 */
type Filter = "all" | "action-needed" | "enrolled" | "not-required"

/**
 * Admin roster of Face ID enrollments.
 *
 * Face verification gates clock-in/out, so this screen answers the two operational questions that
 * creates: who still needs to enroll, and how do I unblock someone whose face stopped matching.
 * Deliberately shows metadata only — no thumbnails, no descriptors.
 */
export function BiometricsManagementSection() {
  const pushToast = useToastStore((s) => s.push)
  const { data: rows = [], isLoading } = useFaceEnrollments()
  const resetMutation = useResetFaceEnrollment()

  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [pendingReset, setPendingReset] =
    useState<FaceEnrollmentAdminRow | null>(null)

  const enrolledCount = rows.filter((r) => r.enrolled).length
  const actionNeeded = rows.filter((r) => r.faceRequired && !r.enrolled)
  const notRequiredCount = rows.filter((r) => !r.faceRequired).length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter === "enrolled" && !r.enrolled) return false
      if (filter === "action-needed" && !(r.faceRequired && !r.enrolled))
        return false
      if (filter === "not-required" && r.faceRequired) return false
      if (!q) return true
      return (
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q)
      )
    })
  }, [rows, query, filter])

  async function confirmReset() {
    if (!pendingReset) return
    try {
      await resetMutation.mutateAsync(pendingReset.userId)
      pushToast(
        `Face ID reset for ${pendingReset.name ?? "employee"}. They can enroll again.`,
        "success"
      )
      setPendingReset(null)
    } catch {
      // error surfaced by the API interceptor toast
    }
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${rows.length})` },
    {
      key: "action-needed",
      label: `Needs enrollment (${actionNeeded.length})`,
    },
    { key: "enrolled", label: `Enrolled (${enrolledCount})` },
    { key: "not-required", label: `Face ID off (${notRequiredCount})` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <HugeiconsIcon icon={FaceIdIcon} size={18} strokeWidth={1.8} />
          Face ID enrollments
        </h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Face ID is required only for roles granted the{" "}
          <span className="font-medium text-foreground">Enroll Face</span>{" "}
          permission — those employees must enroll before they can clock in or
          out. Reset an enrollment to let someone enroll again.
        </p>
      </div>

      {actionNeeded.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
          <HugeiconsIcon
            icon={Alert01Icon}
            size={15}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-amber-500"
          />
          <p className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
            <span className="font-semibold">
              {actionNeeded.length} employee
              {actionNeeded.length === 1 ? "" : "s"}
            </span>{" "}
            need Face ID but haven&apos;t enrolled. They can&apos;t clock in or
            out until they do.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            strokeWidth={2}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={filter === f.key ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No employees match"
          description={
            rows.length === 0
              ? "No employees found for this company."
              : "Try a different search or filter."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-semibold">Employee</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Templates</th>
                <th className="px-4 py-2.5 font-semibold">Enrolled</th>
                <th className="px-4 py-2.5 text-right font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.userId}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.name ?? "—"}</p>
                    <p className="text-[12px] text-muted-foreground">
                      {r.email ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {r.enrolled ? (
                      <StatusBadge variant="green">
                        <HugeiconsIcon
                          icon={CheckmarkBadge01Icon}
                          size={11}
                          strokeWidth={2}
                        />
                        Enrolled
                      </StatusBadge>
                    ) : r.faceRequired ? (
                      // The only actionable state: verification gates their punch, no template yet.
                      <StatusBadge variant="amber">
                        <HugeiconsIcon
                          icon={Alert01Icon}
                          size={11}
                          strokeWidth={2}
                        />
                        Needs enrollment
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="gray">Face ID off</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.templateCount || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {fmtDateTime(r.enrolledAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!r.enrolled}
                      onClick={() => setPendingReset(r)}
                    >
                      <HugeiconsIcon
                        icon={Refresh01Icon}
                        size={13}
                        strokeWidth={2}
                      />
                      Reset
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={pendingReset !== null}
        onOpenChange={(open) => {
          if (!open) setPendingReset(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Face ID?</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/20">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={15}
              strokeWidth={2}
              className="mt-0.5 shrink-0 text-amber-500"
            />
            <p className="text-[12px] leading-relaxed text-amber-700 dark:text-amber-400">
              This permanently deletes the stored face template for{" "}
              <span className="font-semibold">
                {pendingReset?.name ?? "this employee"}
              </span>
              . If their role requires face verification they won&apos;t be able
              to clock in or out until they enroll again.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingReset(null)}
              disabled={resetMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReset}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? "Resetting…" : "Reset Face ID"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
