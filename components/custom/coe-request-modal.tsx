"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  File01Icon,
  CheckmarkCircle02Icon,
  Delete01Icon,
  DocumentAttachmentIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
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
import { cn } from "@/lib/utils"
import { useCreateCoeRequest } from "@/hooks/use-coe"
import {
  COE_PURPOSES,
  COE_CERT_TYPES,
  COE_RELEASE_METHODS,
  COE_PURPOSE_LABEL,
  COE_CERT_TYPE_LABEL,
  COE_CERT_TYPE_DESC,
  COE_RELEASE_METHOD_LABEL,
  COE_RELEASE_METHOD_DESC,
  type CoePurpose,
  type CoeEmploymentStatus,
  type CoeCertificateType,
  type CoeReleaseMethod,
} from "@/lib/coe-api"

const EMPTY_FORM = {
  purpose: "" as CoePurpose | "",
  employmentStatus: "CURRENT_EMPLOYEE" as CoeEmploymentStatus,
  certificateType: "" as CoeCertificateType | "",
  recipientName: "",
  additionalNotes: "",
  releaseMethod: "" as CoeReleaseMethod | "",
  files: [] as File[],
}

/** Employee COE filing form. Shared by the My COE page and the Requests hub. */
export function CoeRequestModal({
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
