"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/custom/table-pagination"
import { useMyPolicyHistory } from "@/hooks/use-schedule-policy"
import type { PolicyVersion } from "@/lib/schedule-policy-api"

interface Props {
  open: boolean
  onClose: () => void
}

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function Summary({ v }: { v: PolicyVersion }) {
  if (v.deletionMarker) {
    return (
      <p className="text-[11px] text-muted-foreground italic">
        My override was removed — schedule reverted to my role / organization
        default.
      </p>
    )
  }
  const p = v.payload
  return (
    <p className="text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">
        {p.requiredHours ?? "—"}h/day
      </span>
      {" · "}Clock-in {p.earliestClockIn ?? "—"}–{p.latestClockIn ?? "—"} (grace{" "}
      {p.lateGraceMins ?? 0}m)
      {" · "}
      {(p.workdays ?? []).join(", ") || "—"}
    </p>
  )
}

export function MyPolicyHistoryModal({ open, onClose }: Props) {
  const [page, setPage] = useState(0)
  const q = useMyPolicyHistory({ page, size: 10 })

  const versions = q.data?.content ?? []
  const totalPages = q.data?.totalPages ?? 0
  const total = q.data?.totalElements ?? 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>My schedule history</DialogTitle>
        </DialogHeader>

        <p className="text-[12px] text-muted-foreground">
          Every change made to your personal schedule override, newest first.
          Past attendance was scored against whichever version was effective at
          the time — those scores are never reclassified.
        </p>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {q.isLoading ? (
            <>
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </>
          ) : versions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
              You don't have any user-level schedule overrides. Your schedule
              comes from your role or the organization default.
            </p>
          ) : (
            versions.map((v, idx) => {
              const isCurrent = idx === 0 && page === 0
              return (
                <div
                  key={v.id}
                  className={
                    v.deletionMarker
                      ? "rounded-lg border border-dashed border-border bg-muted/30 p-3"
                      : "rounded-lg border border-border bg-card p-3"
                  }
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span>{fmtDateTime(v.effectiveFrom)}</span>
                      {v.deletionMarker && (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          Removed
                        </span>
                      )}
                      {isCurrent && !v.deletionMarker && (
                        <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      by {v.createdByName ?? "system"}
                    </span>
                  </div>
                  <Summary v={v} />
                  {v.note && (
                    <p className="mt-1.5 rounded bg-muted/40 px-2 py-1 text-[11px] text-foreground">
                      “{v.note}”
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        {totalPages > 1 && (
          <TablePagination
            page={page + 1}
            totalPages={totalPages}
            total={total}
            pageSize={10}
            setPage={(p) => setPage(p - 1)}
            setPageSize={() => {}}
          />
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
