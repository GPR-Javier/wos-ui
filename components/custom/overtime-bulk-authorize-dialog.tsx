"use client"

import { useEffect, useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  UserGroupIcon,
  Search01Icon,
  Alert01Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useOrgGraph } from "@/hooks/use-org-chart"
import { useBulkAuthorizeOvertime } from "@/hooks/use-overtime"
import { calcHours } from "@/lib/overtime-api"
import { fmtHours } from "@/components/custom/overtime-request-dialog"
import { cn } from "@/lib/utils"

const MIN_OT_HOURS = 1
const ALL_DEPTS = "__ALL__"

function errorMessage(e: unknown): string {
  const data = (e as { response?: { data?: { message?: string } } })?.response
    ?.data
  return data?.message ?? "Failed to pre-authorize. Please try again."
}

function todayISO(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate()
  ).padStart(2, "0")}`
}

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Admin/manager bulk pre-authorization — "filter-and-stage". Picking a department auto-checks its
 * members into the staging list; the approver tweaks the selection (and per-batch window) before
 * confirming. Each checked employee gets an AUTHORIZED row; the server derives the rate type per
 * person and enforces approver scope.
 */
export function OvertimeBulkAuthorizeDialog({ open, onClose }: Props) {
  const { data: graph = [], isLoading } = useOrgGraph()
  const bulkMutation = useBulkAuthorizeOvertime()

  const [date, setDate] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [reason, setReason] = useState("")
  const [dept, setDept] = useState<string>(ALL_DEPTS)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!open) return
    setDate("")
    setStart("")
    setEnd("")
    setReason("")
    setDept(ALL_DEPTS)
    setSearch("")
    setSelected(new Set())
  }, [open])

  const departments = useMemo(() => {
    const names = new Set<string>()
    for (const n of graph) if (n.department) names.add(n.department)
    return Array.from(names).sort()
  }, [graph])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return graph.filter((n) => {
      if (dept !== ALL_DEPTS && n.department !== dept) return false
      if (!term) return true
      return (
        n.name.toLowerCase().includes(term) ||
        (n.title ?? "").toLowerCase().includes(term) ||
        (n.department ?? "").toLowerCase().includes(term)
      )
    })
  }, [graph, dept, search])

  // Picking a department auto-checks its members (still editable). "All" does not auto-check.
  function selectDept(next: string) {
    setDept(next)
    if (next === ALL_DEPTS) return
    setSelected((prev) => {
      const copy = new Set(prev)
      for (const n of graph) if (n.department === next) copy.add(n.id)
      return copy
    })
  }

  function toggle(userId: number) {
    setSelected((prev) => {
      const copy = new Set(prev)
      if (copy.has(userId)) copy.delete(userId)
      else copy.add(userId)
      return copy
    })
  }

  const allVisibleChecked =
    visible.length > 0 && visible.every((n) => selected.has(n.id))

  function toggleAllVisible() {
    setSelected((prev) => {
      const copy = new Set(prev)
      if (allVisibleChecked) for (const n of visible) copy.delete(n.id)
      else for (const n of visible) copy.add(n.id)
      return copy
    })
  }

  const hours = calcHours(start, end)
  const isPast = date !== "" && date < todayISO()
  const rangeOk = !!start && !!end && hours >= MIN_OT_HOURS
  const canSubmit =
    date !== "" &&
    !isPast &&
    rangeOk &&
    reason.trim() !== "" &&
    selected.size > 0

  const submitError = bulkMutation.isError
    ? errorMessage(bulkMutation.error)
    : null

  function handleSubmit() {
    bulkMutation.mutate(
      {
        overtimeDate: date,
        plannedStartTime: start,
        plannedEndTime: end,
        reason,
        userIds: Array.from(selected),
      },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
              <HugeiconsIcon
                icon={UserGroupIcon}
                size={14}
                strokeWidth={1.8}
                className="text-primary"
              />
            </div>
            Bulk Pre-authorize Overtime
          </DialogTitle>
          <DialogDescription>
            Authorize planned overtime for a team ahead of time — they file
            their actual hours afterward.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Left: batch details */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Planned Date</Label>
              <Input
                type="date"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-[13px]"
              />
              {isPast && (
                <p className="flex items-center gap-1.5 text-[12px] text-red-500">
                  <HugeiconsIcon icon={Alert01Icon} size={12} strokeWidth={2} />
                  Pre-authorization is for upcoming work.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Start</Label>
                <Input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">End</Label>
                <Input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="h-9 text-[13px]"
                />
              </div>
            </div>
            {hours > 0 && (
              <div className="flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-[12px]">
                <span className="text-primary">Estimated window</span>
                <span className="font-bold text-primary tabular-nums">
                  {fmtHours(hours)}
                </span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-[12px]">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Why is this overtime planned?…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-16 resize-none text-[13px]"
              />
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
              <HugeiconsIcon
                icon={InformationCircleIcon}
                size={13}
                strokeWidth={1.8}
                className="mt-0.5 shrink-0"
              />
              The rate type (rest day / holiday / regular) is derived per
              employee from their own schedule. Employees already holding a
              request for this date are skipped.
            </div>
          </div>

          {/* Right: staged employee list */}
          <div className="flex flex-col rounded-lg border border-border">
            <div className="space-y-2 border-b border-border p-2.5">
              <select
                value={dept}
                onChange={(e) => selectDept(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]"
              >
                <option value={ALL_DEPTS}>All departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <div className="relative">
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={13}
                  strokeWidth={2}
                  className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  className="h-8 pl-8 text-[12px]"
                  placeholder="Search employee…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between px-0.5">
                <button
                  type="button"
                  onClick={toggleAllVisible}
                  className="text-[12px] font-medium text-primary hover:underline"
                  disabled={visible.length === 0}
                >
                  {allVisibleChecked ? "Clear shown" : "Select shown"}
                </button>
                <span className="text-[11px] text-muted-foreground">
                  {selected.size} selected
                </span>
              </div>
            </div>

            <div className="max-h-64 min-h-40 overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-center text-[12px] text-muted-foreground">
                  Loading…
                </p>
              ) : visible.length === 0 ? (
                <p className="p-4 text-center text-[12px] text-muted-foreground">
                  No employees match.
                </p>
              ) : (
                visible.map((n) => (
                  <label
                    key={n.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 border-b border-border/60 px-3 py-2 text-[12px] hover:bg-muted/40",
                      selected.has(n.id) && "bg-primary/5"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(n.id)}
                      onChange={() => toggle(n.id)}
                      className="size-4 shrink-0 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {n.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {[n.title, n.department].filter(Boolean).join(" · ") ||
                          "—"}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800/40 dark:bg-red-900/10">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={14}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
            />
            <p className="text-[12px] text-red-700 dark:text-red-400">
              {submitError}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={bulkMutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit || bulkMutation.isPending}
            onClick={handleSubmit}
          >
            {bulkMutation.isPending
              ? "Authorizing…"
              : `Authorize ${selected.size || ""}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
