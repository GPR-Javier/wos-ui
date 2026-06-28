"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
} from "@hugeicons/core-free-icons"
import {
  usePayrollRuns,
  useRunSteps,
  useCreatePayrollRun,
  useProcessRun,
  useReleaseRun,
} from "@/hooks/use-payroll"
import { type RunStatus, type StepStatus } from "@/lib/payroll-api"
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

function CreateRunDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [periodStart, setPeriodStart] = useState("")
  const [periodEnd, setPeriodEnd] = useState("")
  const createMutation = useCreatePayrollRun()

  async function handleCreate() {
    if (!periodStart || !periodEnd) return
    await createMutation.mutateAsync({ periodStart, periodEnd })
    setPeriodStart("")
    setPeriodEnd("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Payroll Run</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Period start</Label>
            <Input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Period end</Label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!periodStart || !periodEnd || createMutation.isPending}
              onClick={handleCreate}
            >
              {createMutation.isPending ? "Creating…" : "Create run"}
            </Button>
          </div>
        </div>
      </DialogContent>
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

      <CreateRunDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
