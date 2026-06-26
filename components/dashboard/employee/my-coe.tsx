"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  File01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Clock01Icon,
  EyeIcon,
  Delete01Icon,
  DocumentAttachmentIcon,
  InformationCircleIcon,
  ArrowRight01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { StatCard } from "@/components/custom/stat-card"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { TablePagination } from "@/components/custom/table-pagination"
import { cn } from "@/lib/utils"
import {
  useMyCoeRequests,
  useCreateCoeRequest,
  useCancelCoeRequest,
} from "@/hooks/use-coe"
import {
  COE_PURPOSES,
  COE_CERT_TYPES,
  COE_RELEASE_METHODS,
  COE_PURPOSE_LABEL,
  COE_PURPOSE_COLOR,
  COE_CERT_TYPE_LABEL,
  COE_CERT_TYPE_DESC,
  COE_CERT_TYPE_COLOR,
  COE_RELEASE_METHOD_LABEL,
  COE_RELEASE_METHOD_DESC,
  type CoeRequest,
  type CoeStatus,
  type CoePurpose,
  type CoeEmploymentStatus,
  type CoeCertificateType,
  type CoeReleaseMethod,
} from "@/lib/coe-api"

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<
  CoeStatus,
  "amber" | "green" | "red" | "blue" | "purple" | "gray"
> = {
  DRAFT: "gray",
  SUBMITTED: "amber",
  PENDING_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
  RELEASED: "purple",
  COMPLETED: "green",
}

const STATUS_LABEL: Record<CoeStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  PENDING_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RELEASED: "Released",
  COMPLETED: "Completed",
}

const STATUS_FILTERS: { label: string; value?: CoeStatus }[] = [
  { label: "All" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under Review", value: "PENDING_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Released", value: "RELEASED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Draft", value: "DRAFT" },
]

// ── Status Timeline ───────────────────────────────────────────────────────────

const TIMELINE_STEPS: { label: string; status: CoeStatus }[] = [
  { label: "Submitted", status: "SUBMITTED" },
  { label: "Under Review", status: "PENDING_REVIEW" },
  { label: "Approved", status: "APPROVED" },
  { label: "Released", status: "RELEASED" },
]

const STATUS_ORDER: CoeStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "RELEASED",
  "COMPLETED",
]

function StatusTimeline({ status }: { status: CoeStatus }) {
  if (status === "REJECTED") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-800/30 dark:bg-red-900/10">
        <HugeiconsIcon
          icon={Cancel01Icon}
          size={14}
          strokeWidth={2}
          className="text-red-500"
        />
        <p className="text-[12px] font-medium text-red-600">
          This request has been rejected.
        </p>
      </div>
    )
  }
  if (status === "DRAFT") return null

  const currentIdx = STATUS_ORDER.indexOf(status)

  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {TIMELINE_STEPS.map((step, i) => {
        const stepIdx = STATUS_ORDER.indexOf(step.status)
        const isDone = stepIdx < currentIdx
        const isActive = stepIdx === currentIdx

        return (
          <div key={step.status} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
                isDone
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : isActive
                    ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isDone && (
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  size={10}
                  strokeWidth={2}
                />
              )}
              {step.label}
            </div>
            {i < TIMELINE_STEPS.length - 1 && (
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={11}
                strokeWidth={2}
                className="shrink-0 text-muted-foreground/50"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ── Request Form Dialog ───────────────────────────────────────────────────────

const EMPTY_FORM = {
  purpose: "" as CoePurpose | "",
  employmentStatus: "CURRENT_EMPLOYEE" as CoeEmploymentStatus,
  certificateType: "" as CoeCertificateType | "",
  recipientName: "",
  additionalNotes: "",
  releaseMethod: "" as CoeReleaseMethod | "",
  files: [] as File[],
}

function RequestFormDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [dragOver, setDragOver] = useState(false)

  const create = useCreateCoeRequest()

  function handleFile(files: FileList | null) {
    if (!files) return
    setForm((f) => ({ ...f, files: [...f.files, ...Array.from(files)] }))
  }

  function removeFile(idx: number) {
    setForm((f) => ({ ...f, files: f.files.filter((_, i) => i !== idx) }))
  }

  function isValid() {
    return form.purpose && form.certificateType && form.releaseMethod
  }

  function submit(isDraft: boolean) {
    if (!form.purpose || !form.certificateType || !form.releaseMethod) return
    create.mutate(
      {
        purpose: form.purpose as CoePurpose,
        employmentStatus: form.employmentStatus,
        certificateType: form.certificateType as CoeCertificateType,
        recipientName: form.recipientName || undefined,
        additionalNotes: form.additionalNotes || undefined,
        releaseMethod: form.releaseMethod as CoeReleaseMethod,
        isDraft,
      },
      {
        onSuccess: () => {
          setForm({ ...EMPTY_FORM })
          onClose()
        },
      }
    )
  }

  const busy = create.isPending

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon
                icon={File01Icon}
                size={13}
                strokeWidth={2}
                className="text-primary"
              />
            </span>
            New COE Request
          </DialogTitle>
          <DialogDescription>
            Submit a Certificate of Employment request. Required fields are
            marked with *.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Purpose */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Purpose <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.purpose}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, purpose: v as CoePurpose }))
              }
            >
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Select purpose…" />
              </SelectTrigger>
              <SelectContent>
                {COE_PURPOSES.map((p) => (
                  <SelectItem key={p} value={p} className="text-[13px]">
                    {COE_PURPOSE_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Employment Status */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">Employment Status</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                ["CURRENT_EMPLOYEE", "FORMER_EMPLOYEE"] as CoeEmploymentStatus[]
              ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, employmentStatus: s }))
                  }
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition-all",
                    form.employmentStatus === s
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  <p className="text-[12px] font-semibold text-foreground">
                    {s === "CURRENT_EMPLOYEE"
                      ? "Current Employee"
                      : "Former Employee"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {s === "CURRENT_EMPLOYEE"
                      ? "Still actively employed"
                      : "No longer with the company"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Certificate Type */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Certificate Type <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {COE_CERT_TYPES.map((ct) => (
                <button
                  key={ct}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, certificateType: ct }))
                  }
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition-all",
                    form.certificateType === ct
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[12px] font-semibold text-foreground">
                      {COE_CERT_TYPE_LABEL[ct]}
                    </p>
                    {form.certificateType === ct && (
                      <HugeiconsIcon
                        icon={CheckmarkCircle02Icon}
                        size={13}
                        strokeWidth={2}
                        className="shrink-0 text-primary"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {COE_CERT_TYPE_DESC[ct]}
                  </p>
                </button>
              ))}
            </div>
            {form.certificateType === "COE_WITH_SALARY" ||
            form.certificateType === "COE_WITH_COMPENSATION_DETAILS" ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800/30 dark:bg-amber-900/10">
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={13}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0 text-amber-600"
                />
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Salary information requires HR approval before it can be
                  included in your COE.
                </p>
              </div>
            ) : null}
          </div>

          {/* Release Method */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Preferred Release Method <span className="text-red-500">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {COE_RELEASE_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, releaseMethod: m }))}
                  className={cn(
                    "rounded-lg border-2 p-3 text-left transition-all",
                    form.releaseMethod === m
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  )}
                >
                  <p className="text-[12px] font-semibold text-foreground">
                    {COE_RELEASE_METHOD_LABEL[m]}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {COE_RELEASE_METHOD_DESC[m]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient / Company */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Recipient / Company Name{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              className="h-9 text-[13px]"
              placeholder="e.g. ABC Bank, Embassy of Japan…"
              value={form.recipientName}
              onChange={(e) =>
                setForm((f) => ({ ...f, recipientName: e.target.value }))
              }
            />
          </div>

          {/* Additional Notes */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Additional Notes / Instructions{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              className="min-h-18 resize-none text-[13px]"
              placeholder="Any special instructions for HR, specific wording required, etc."
              value={form.additionalNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, additionalNotes: e.target.value }))
              }
            />
          </div>

          {/* Attachments */}
          <div className="space-y-1.5">
            <Label className="text-[12px]">
              Attachments{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Authorization letter, valid ID, or supporting documents
            </p>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                handleFile(e.dataTransfer.files)
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-5 transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/20 hover:border-primary/40"
              )}
              onClick={() =>
                document.getElementById("coe-file-upload")?.click()
              }
            >
              <HugeiconsIcon
                icon={DocumentAttachmentIcon}
                size={20}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
              <p className="text-[12px] text-muted-foreground">
                Drop files here or{" "}
                <span className="font-medium text-primary">browse</span>
              </p>
              <input
                id="coe-file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFile(e.target.files)}
              />
            </div>

            {form.files.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {form.files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                  >
                    <HugeiconsIcon
                      icon={File01Icon}
                      size={13}
                      strokeWidth={1.8}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-danger"
                    >
                      <HugeiconsIcon
                        icon={Delete01Icon}
                        size={13}
                        strokeWidth={2}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !isValid()}
            onClick={() => submit(true)}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            disabled={busy || !isValid()}
            onClick={() => submit(false)}
          >
            {busy ? "Submitting…" : "Submit Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Detail Dialog ──────────────────────────────────────────────────────────────

function DetailDialog({
  coe,
  onClose,
}: {
  coe: CoeRequest
  onClose: () => void
}) {
  const cancel = useCancelCoeRequest()
  const canCancel = coe.status === "DRAFT" || coe.status === "SUBMITTED"

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10">
              <HugeiconsIcon
                icon={File01Icon}
                size={13}
                strokeWidth={2}
                className="text-primary"
              />
            </span>
            COE Request Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Reference & status */}
          <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <div>
              <p className="text-[11px] text-muted-foreground">Reference No.</p>
              <p className="text-[13px] font-semibold text-foreground">
                {coe.referenceNumber ?? "—"}
              </p>
            </div>
            <StatusBadge
              variant={STATUS_VARIANT[coe.status]}
              className="shrink-0"
            >
              {STATUS_LABEL[coe.status]}
            </StatusBadge>
          </div>

          {/* Status timeline */}
          {coe.status !== "DRAFT" && <StatusTimeline status={coe.status} />}

          {/* Fields */}
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Purpose</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {COE_PURPOSE_LABEL[coe.purpose]}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
              <p className="text-muted-foreground">Employment Status</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {coe.employmentStatus === "CURRENT_EMPLOYEE"
                  ? "Current Employee"
                  : "Former Employee"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Certificate Type</span>
            <StatusBadge
              variant={COE_CERT_TYPE_COLOR[coe.certificateType]}
              dot={false}
            >
              {COE_CERT_TYPE_LABEL[coe.certificateType]}
            </StatusBadge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <span className="text-muted-foreground">Release Method</span>
            <span className="font-medium text-foreground">
              {COE_RELEASE_METHOD_LABEL[coe.releaseMethod]}
            </span>
          </div>

          {coe.recipientName && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px]">
              <p className="text-muted-foreground">Recipient / Company</p>
              <p className="mt-0.5 font-semibold text-foreground">
                {coe.recipientName}
              </p>
            </div>
          )}

          {coe.additionalNotes && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Your Notes
              </p>
              <p className="text-[12px] text-foreground italic">
                &ldquo;{coe.additionalNotes}&rdquo;
              </p>
            </div>
          )}

          {/* Attachments */}
          {coe.attachmentUrls?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Attachments ({coe.attachmentUrls.length})
              </p>
              {coe.attachmentUrls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[12px] text-primary hover:bg-muted/40"
                >
                  <HugeiconsIcon
                    icon={File01Icon}
                    size={13}
                    strokeWidth={1.8}
                  />
                  View attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          {/* Document link (released) */}
          {coe.documentUrl && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 dark:border-green-800/30 dark:bg-green-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-green-700 uppercase">
                COE Document Ready
              </p>
              <a
                href={coe.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[12px] font-medium text-green-700 underline underline-offset-2 hover:text-green-800"
              >
                Download your Certificate of Employment
              </a>
            </div>
          )}

          {/* HR remarks */}
          {coe.remarks && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="mb-1 text-[11px] font-semibold tracking-wider text-blue-600 uppercase">
                HR / Admin Remarks
              </p>
              <p className="text-[12px] text-blue-700 dark:text-blue-300">
                {coe.remarks}
              </p>
              {coe.approvedByName && (
                <p className="mt-1 text-[11px] text-blue-500">
                  — {coe.approvedByName}
                  {coe.approvedAt ? `, ${fmtDate(coe.approvedAt)}` : ""}
                </p>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Filed {fmtDate(coe.createdAt)}
          </p>
        </div>

        <DialogFooter className="gap-2">
          {canCancel && (
            <Button
              variant="destructive"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(coe.id, { onSuccess: onClose })}
            >
              {cancel.isPending ? "Cancelling…" : "Cancel Request"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function MyCOESection() {
  const [statusFilter, setStatusFilter] = useState<CoeStatus | undefined>(
    undefined
  )
  const [page, setPage] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<CoeRequest | null>(null)

  const q = useMyCoeRequests({ status: statusFilter, page, size: 20 })
  const items = q.data?.content ?? []
  const total = q.data?.totalElements ?? 0
  const totalPages = q.data?.totalPages ?? 0

  const summaryQ = useMyCoeRequests({ size: 200 })
  const all = summaryQ.data?.content ?? []
  const counts = {
    submitted: all.filter((r) => r.status === "SUBMITTED").length,
    underReview: all.filter((r) => r.status === "PENDING_REVIEW").length,
    released: all.filter(
      (r) => r.status === "RELEASED" || r.status === "COMPLETED"
    ).length,
    total: all.length,
  }

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-bold text-foreground">
            Certificate of Employment
          </h1>
          <p className="text-[12px] text-muted-foreground">
            Request and track your employment certificates
          </p>
        </div>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={14}
            strokeWidth={2}
            className="mr-1.5"
          />
          New Request
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={counts.total}
          meta="All time"
          accent="blue"
          icon={<HugeiconsIcon icon={File01Icon} size={16} strokeWidth={1.8} />}
        />
        <StatCard
          title="Submitted"
          value={<span className="text-warning">{counts.submitted}</span>}
          meta="Awaiting review"
          accent="amber"
          icon={
            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Under Review"
          value={<span className="text-blue-500">{counts.underReview}</span>}
          meta="Being processed"
          accent="blue"
          icon={
            <HugeiconsIcon icon={Alert01Icon} size={16} strokeWidth={1.8} />
          }
        />
        <StatCard
          title="Released"
          value={<span className="text-success">{counts.released}</span>}
          meta="Ready to download"
          accent="green"
          icon={
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              size={16}
              strokeWidth={1.8}
            />
          }
        />
      </div>

      {/* ── Table card ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex flex-wrap rounded-lg border border-border bg-muted/40 p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setStatusFilter(f.value)
                  setPage(0)
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  statusFilter === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Purpose",
                "Certificate Type",
                "Release Method",
                "Date Filed",
                "Status",
                "Actions",
              ].map((h) => (
                <TableHead
                  key={h}
                  className={h === "Actions" ? "text-right" : undefined}
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <>
                {[0, 1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    {[0, 1, 2, 3, 4, 5].map((j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-3 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <HugeiconsIcon
                      icon={File01Icon}
                      size={28}
                      strokeWidth={1.3}
                      className="text-muted-foreground/30"
                    />
                    <p>No COE requests found.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setFormOpen(true)}
                    >
                      File your first request
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => setSelected(r)}
                >
                  {/* Purpose */}
                  <TableCell>
                    <StatusBadge
                      variant={COE_PURPOSE_COLOR[r.purpose]}
                      dot={false}
                    >
                      {COE_PURPOSE_LABEL[r.purpose]}
                    </StatusBadge>
                  </TableCell>

                  {/* Certificate Type */}
                  <TableCell>
                    <StatusBadge
                      variant={COE_CERT_TYPE_COLOR[r.certificateType]}
                      dot={false}
                    >
                      {COE_CERT_TYPE_LABEL[r.certificateType]}
                    </StatusBadge>
                  </TableCell>

                  {/* Release Method */}
                  <TableCell className="text-[12px] text-muted-foreground">
                    {COE_RELEASE_METHOD_LABEL[r.releaseMethod]}
                  </TableCell>

                  {/* Date */}
                  <TableCell className="text-[12px] text-muted-foreground tabular-nums">
                    {fmtDate(r.createdAt)}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <StatusBadge variant={STATUS_VARIANT[r.status]}>
                      {STATUS_LABEL[r.status]}
                    </StatusBadge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <Button
                      size="icon-xs"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelected(r)
                      }}
                      title="View details"
                    >
                      <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="border-t border-border p-4">
            <TablePagination
              page={page + 1}
              totalPages={totalPages}
              total={total}
              pageSize={20}
              setPage={(p) => setPage(p - 1)}
              setPageSize={() => {}}
            />
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}
      {formOpen && (
        <RequestFormDialog open={formOpen} onClose={() => setFormOpen(false)} />
      )}
      {selected && (
        <DetailDialog coe={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
