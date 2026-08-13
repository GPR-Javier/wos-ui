"use client"

import { useMemo, useState } from "react"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  CheckmarkCircle01Icon,
  Refresh01Icon,
  ArrowDown01Icon,
  PlayCircle02Icon,
  MoneySend01Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons"
import {
  usePayrollRuns,
  useRunSteps,
  useCreatePayrollRun,
  useRunPreview,
  useProcessRun,
  useReleaseRun,
} from "@/hooks/use-payroll"
import {
  DateRangePicker,
  type DateRangePreset,
  type DateRangeValue,
} from "@/components/ui/date-range-picker"
import { PayrollRunPreviewModal } from "./payroll-run-preview-modal"
import {
  type PayrollRun,
  type RunStatus,
  type StepStatus,
} from "@/lib/payroll-api"
import { cn } from "@/lib/utils"

const PROCESSING_STEPS = [
  { step: "attendance_finalized", label: "Attendance Finalized" },
  { step: "hours_computed", label: "Hours Computed" },
  { step: "incentives_added", label: "Incentives Added" },
  { step: "deductions_applied", label: "Deductions Applied" },
  { step: "payroll_generated", label: "Payroll Generated" },
  { step: "payslip_released", label: "Payslip Released" },
]

function runStatusVariant(s: RunStatus): "green" | "blue" | "amber" | "gray" {
  switch (s) {
    case "released":
      return "green"
    case "generated":
      return "blue"
    case "processing":
      return "amber"
    case "draft":
      return "gray"
  }
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done")
    return (
      <HugeiconsIcon
        icon={CheckmarkCircle01Icon}
        size={16}
        strokeWidth={2}
        className="text-green-500"
      />
    )
  if (status === "in-progress")
    return (
      <HugeiconsIcon
        icon={Refresh01Icon}
        size={16}
        strokeWidth={2}
        className="animate-spin text-primary"
      />
    )
  return <div className="size-4 rounded-full border-2 border-border" />
}

function fmt(n: number) {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
}

// ── Run steps panel ────────────────────────────────────────────────────────

function RunStepsPanel({ runId }: { runId: number }) {
  const { data: steps = [] } = useRunSteps(runId)

  const resolved =
    steps.length > 0
      ? steps
      : PROCESSING_STEPS.map((s) => ({
          ...s,
          completedAt: null,
          status: "pending" as StepStatus,
        }))

  return (
    <div className="grid grid-cols-2 gap-3 py-1 sm:grid-cols-3 lg:grid-cols-6">
      {resolved.map((s, i) => (
        <div key={s.step} className="flex items-start gap-2">
          {i > 0 && (
            <div
              className={cn(
                "mt-2 -mr-1 h-0.5 w-3 shrink-0",
                resolved[i - 1].status === "done" ? "bg-green-400" : "bg-border"
              )}
            />
          )}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <StepIcon status={s.status} />
            <span
              className={cn(
                "text-[10px] leading-tight font-medium",
                s.status === "done"
                  ? "text-green-600 dark:text-green-400"
                  : s.status === "in-progress"
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              {s.label}
            </span>
            {s.completedAt && (
              <span className="text-[9px] text-muted-foreground/60">
                {new Date(s.completedAt).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Create run dialog ──────────────────────────────────────────────────────

/**
 * PH payroll is usually semi-monthly (1st–15th, 16th–EOM), so those are the presets that matter —
 * whole-month options are there for monthly payers.
 */
const PERIOD_PRESETS: DateRangePreset[] = [
  {
    label: "1st – 15th (this month)",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 1),
        until: new Date(n.getFullYear(), n.getMonth(), 15),
      }
    },
  },
  {
    label: "16th – end (this month)",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 16),
        until: new Date(n.getFullYear(), n.getMonth() + 1, 0),
      }
    },
  },
  {
    label: "This month",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth(), 1),
        until: new Date(n.getFullYear(), n.getMonth() + 1, 0),
      }
    },
  },
  {
    label: "Last month",
    range: () => {
      const n = new Date()
      return {
        from: new Date(n.getFullYear(), n.getMonth() - 1, 1),
        until: new Date(n.getFullYear(), n.getMonth(), 0),
      }
    },
  },
]

function CreateRunDialog({
  open,
  onClose,
  existingRuns,
}: {
  open: boolean
  onClose: () => void
  /** Periods already covered by a run — blocked in the picker so periods can't overlap. */
  existingRuns: PayrollRun[]
}) {
  const [range, setRange] = useState<Partial<DateRangeValue> | null>(null)
  /** null until the admin touches the list — meaning "everyone eligible". */
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [previewOpen, setPreviewOpen] = useState(false)
  /** Set to preview one person's breakdown instead of the whole run. */
  const [previewUserId, setPreviewUserId] = useState<number | null>(null)
  const createMutation = useCreatePayrollRun()
  const { data: candidates = [], isLoading } = useRunPreview(
    range?.from,
    range?.until,
    open
  )

  // Every existing run's period, blocked in the picker. Includes drafts: a draft still reserves
  // its period, and two runs covering the same dates is the mistake worth preventing.
  const coveredPeriods = useMemo(
    () =>
      existingRuns
        .filter((r) => r.periodStart && r.periodEnd)
        .map((r) => ({
          from: r.periodStart,
          until: r.periodEnd,
          label: `Covered by the ${r.period} run (${r.status})`,
        })),
    [existingRuns]
  )

  const eligible = candidates.filter((c) => c.eligible)
  const skipped = candidates.filter((c) => !c.eligible)
  const included = eligible.filter((c) => !excluded.has(c.userId))

  function toggle(userId: number) {
    setExcluded((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleCreate() {
    if (!range?.from || !range?.until || included.length === 0) return
    await createMutation.mutateAsync({
      periodStart: range.from,
      periodEnd: range.until,
      // Send ids only when the admin narrowed the list; empty means "everyone eligible", which
      // keeps the run correct if someone becomes payable between creating and processing.
      includedUserIds:
        excluded.size === 0 ? undefined : included.map((c) => c.userId),
    })
    setRange(null)
    setExcluded(new Set())
    setPreviewOpen(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Payroll Run</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Pay period</Label>
            <DateRangePicker
              value={range}
              onChange={setRange}
              presets={PERIOD_PRESETS}
              disabledRanges={coveredPeriods}
              fromPlaceholder="Period start"
              untilPlaceholder="Period end"
            />
            {coveredPeriods.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Dates already covered by a payroll run can&apos;t be selected —
                paying the same period twice is not recoverable once released.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[12px]">
                Employees ({included.length} of {eligible.length})
              </Label>
              {eligible.length > 0 && (
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline"
                  onClick={() =>
                    setExcluded(
                      excluded.size === 0
                        ? new Set(eligible.map((c) => c.userId))
                        : new Set()
                    )
                  }
                >
                  {excluded.size === 0 ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
              {!range?.from || !range?.until ? (
                <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                  Pick a pay period to see who&apos;s covered and what
                  they&apos;d be paid.
                </p>
              ) : isLoading ? (
                <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                  Calculating…
                </p>
              ) : candidates.length === 0 ? (
                <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                  No active employees found.
                </p>
              ) : (
                <>
                  {eligible.map((c) => (
                    <label
                      key={c.userId}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-border px-3 py-2 last:border-0 hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={!excluded.has(c.userId)}
                        onChange={() => toggle(c.userId)}
                        className="size-3.5 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium">
                          {c.name ?? c.employeeId}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {c.position ?? "—"}
                          {/* Where the pay came from — a surprising figure is traceable here
                              rather than by opening the contract and the position setup. */}
                          {c.salarySource ? ` · ${c.salarySource}` : ""}
                        </span>
                      </span>
                      {/* Per-employee breakdown. Not a submit, and must not toggle the row's
                          checkbox — the whole row is a label. */}
                      <button
                        type="button"
                        title={`Preview ${c.name ?? "employee"}`}
                        aria-label={`Preview ${c.name ?? "employee"}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setPreviewUserId(c.userId)
                          setPreviewOpen(true)
                        }}
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon
                          icon={EyeIcon}
                          size={14}
                          strokeWidth={2}
                        />
                      </button>
                    </label>
                  ))}

                  {/* Surfaced rather than silently dropped during processing. */}
                  {skipped.map((c) => (
                    <div
                      key={c.userId}
                      className="flex items-center gap-2.5 border-b border-border px-3 py-2 opacity-60 last:border-0"
                    >
                      <span className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-medium line-through">
                          {c.name ?? c.employeeId}
                        </span>
                        <span className="block truncate text-[11px] text-amber-600 dark:text-amber-400">
                          {c.reason}
                        </span>
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
            {skipped.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {`${skipped.length} employee${skipped.length === 1 ? "" : "s"} can't be paid yet and will be left out of this run.`}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {/* Creation goes through the preview: seeing the amounts before committing is the
                point, so there's no way to skip straight past it. */}
            <Button
              size="sm"
              disabled={
                !range?.from ||
                !range?.until ||
                included.length === 0 ||
                isLoading
              }
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </Button>
          </div>
        </div>
      </DialogContent>

      <PayrollRunPreviewModal
        open={previewOpen}
        singleEmployee={previewUserId != null}
        onClose={() => {
          setPreviewOpen(false)
          setPreviewUserId(null)
        }}
        onConfirm={handleCreate}
        candidates={
          previewUserId != null
            ? candidates.filter((c) => c.userId === previewUserId)
            : candidates.filter((c) => !c.eligible || !excluded.has(c.userId))
        }
        isLoading={isLoading}
        periodStart={range?.from}
        periodEnd={range?.until}
        confirming={createMutation.isPending}
      />
    </Dialog>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function PayrollRuns({
  onViewPayslips,
}: {
  onViewPayslips: (runId: number) => void
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data, isLoading, isError } = usePayrollRuns()
  const processMutation = useProcessRun()
  const releaseMutation = useReleaseRun()

  const runs = data?.content ?? []

  const COLUMNS = [
    "Period",
    "Status",
    "Employees",
    "Total Amount",
    "Created",
    "",
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          Each payroll run represents a pay period.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          New payroll run
        </Button>
      </div>

      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load payroll runs
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((h) => (
              <TableHead
                key={h}
                className={h === "" ? "text-right" : undefined}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : runs.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No payroll runs yet
              </TableCell>
            </TableRow>
          ) : (
            runs.flatMap((run) => {
              const rows = [
                <TableRow
                  key={run.id}
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedId((p) => (p === run.id ? null : run.id))
                  }
                >
                  <TableCell>
                    <p className="text-[13px] font-medium">{run.period}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {run.periodStart} → {run.periodEnd}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={runStatusVariant(run.status)}
                      dot={false}
                    >
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {run.employeeCount}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {fmt(run.totalAmount)}
                  </TableCell>
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {new Date(run.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      {run.status === "draft" && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => processMutation.mutate(run.id)}
                          disabled={processMutation.isPending}
                        >
                          <HugeiconsIcon
                            icon={PlayCircle02Icon}
                            size={12}
                            strokeWidth={2}
                          />
                          Process
                        </Button>
                      )}
                      {run.status === "generated" && (
                        <Button
                          size="xs"
                          onClick={() => releaseMutation.mutate(run.id)}
                          disabled={releaseMutation.isPending}
                        >
                          <HugeiconsIcon
                            icon={MoneySend01Icon}
                            size={12}
                            strokeWidth={2}
                          />
                          Release
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onViewPayslips(run.id)}
                      >
                        View payslips
                      </Button>
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        size={13}
                        strokeWidth={2}
                        className={cn(
                          "text-muted-foreground transition-transform",
                          expandedId === run.id && "rotate-180"
                        )}
                      />
                    </div>
                  </TableCell>
                </TableRow>,
              ]

              if (expandedId === run.id) {
                rows.push(
                  <TableRow key={`${run.id}-steps`} className="bg-muted/20">
                    <TableCell colSpan={COLUMNS.length} className="px-6 py-4">
                      <p className="mb-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                        Processing Steps
                      </p>
                      <RunStepsPanel runId={run.id} />
                    </TableCell>
                  </TableRow>
                )
              }

              return rows
            })
          )}
        </TableBody>
      </Table>

      <CreateRunDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        existingRuns={runs}
      />
    </div>
  )
}
