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
import { usePolicyHistory } from "@/hooks/use-schedule-policy"
import type {
  PolicyScope,
  PolicyVersion,
} from "@/lib/schedule-policy-api"

interface Props {
  open: boolean
  scope: PolicyScope
  scopeRef: number | null
  scopeLabel: string
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

function PayloadSummary({ v }: { v: PolicyVersion }) {
  if (v.deletionMarker) {
    return (
      <p className="text-[11px] italic text-muted-foreground">
        Override removed — resolution falls through to the parent scope from this date onward.
      </p>
    )
  }
  const p = v.payload
  return (
    <div className="space-y-0.5 text-[11px] text-muted-foreground">
      <div>
        <span className="font-medium text-foreground">Clock-in:</span>{" "}
        {p.earliestClockIn ?? "—"} – {p.latestClockIn ?? "—"} (grace{" "}
        {p.lateGraceMins ?? 0}m)
      </div>
      <div>
        <span className="font-medium text-foreground">Clock-out:</span>{" "}
        {p.earliestClockOut ?? "—"} – {p.latestClockOut ?? "—"}
      </div>
      <div>
        <span className="font-medium text-foreground">Hours:</span>{" "}
        {p.requiredHours ?? "—"}h · undertime grace {p.undertimeGraceMins ?? 0}m
      </div>
      <div>
        <span className="font-medium text-foreground">Workdays:</span>{" "}
        {(p.workdays ?? []).join(", ") || "—"}
      </div>
    </div>
  )
}

export function PolicyHistoryModal({
  open,
  scope,
  scopeRef,
  scopeLabel,
  onClose,
}: Props) {
  const [page, setPage] = useState(0)
  const historyQ = usePolicyHistory(scope, { scopeRef, page, size: 10 })

  const versions = historyQ.data?.content ?? []
  const total = historyQ.data?.totalElements ?? 0
  const totalPages = historyQ.data?.totalPages ?? 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[15px]">
            Policy history · <span className="text-muted-foreground">{scopeLabel}</span>
          </DialogTitle>
        </DialogHeader>

        <p className="text-[12px] text-muted-foreground">
          Newest first. Each row is an immutable version — attendance recorded
          while a version was effective is permanently scored against that
          version's snapshot.
        </p>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {historyQ.isLoading ? (
            <>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </>
          ) : versions.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
              No versions yet. Save a policy to start the history.
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
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[12px]">
                      <span className="font-medium">v{v.id}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>Effective {fmtDateTime(v.effectiveFrom)}</span>
                      {v.deletionMarker && (
                        <span className="ml-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 dark:bg-red-900/20 dark:text-red-300">
                          Removed
                        </span>
                      )}
                      {isCurrent && !v.deletionMarker && (
                        <span className="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-300">
                          Current
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {v.createdByName ?? "system"}
                    </span>
                  </div>
                  <PayloadSummary v={v} />
                  {v.note && (
                    <p className="mt-2 rounded bg-muted/40 px-2 py-1 text-[11px] text-foreground">
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
