"use client"

import { useCallback, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CloudUploadIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Refresh01Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons"
import { useUploadSchedule } from "@/hooks/use-schedule"
import { cn } from "@/lib/utils"

const TEMPLATE_HEADERS = [
  "classId",
  "date",
  "startTime",
  "endTime",
  "durationMinutes",
  "teacherName",
  "teacherStatus",
  "studentName",
  "scheduleStatus",
  "attendanceStatus",
  "timeIn",
  "timeOut",
  "lateMinutes",
  "sessionNotes",
  "teamLeader",
  "rating",
  "issueFlag",
]

const TEMPLATE_SAMPLE = [
  "CLASS-001",
  "2025-01-20",
  "09:00",
  "10:00",
  "60",
  "John Smith",
  "online",
  "Jane Doe",
  "completed",
  "present",
  "09:02",
  "10:01",
  "0",
  "Good session",
  "Mary Johnson",
  "4.5",
  "false",
]

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, TEMPLATE_SAMPLE]
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "schedule_template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

const ACCEPTED = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]

function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ")
}

interface Props {
  open: boolean
  onClose: () => void
}

type UploadState = "idle" | "uploading" | "success" | "error"

export function ScheduleUploadDialog({ open, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const uploadMutation = useUploadSchedule()

  function reset() {
    setFile(null)
    setFileError(null)
    setTitle("")
    setNotes("")
    setUploadState("idle")
    setErrorMessage("")
    setDragging(false)
  }

  function handleClose() {
    if (uploadState === "uploading") return
    reset()
    onClose()
  }

  function validateAndSet(f: File) {
    if (!ACCEPTED.includes(f.type) && !f.name.match(/\.(xlsx|xls)$/i)) {
      setFileError("Only .xlsx and .xls files are accepted.")
      setFile(null)
      return
    }
    setFileError(null)
    setFile(f)
    setTitle(titleFromFileName(f.name))
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) validateAndSet(f)
  }, [])

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploadState("uploading")
    try {
      await uploadMutation.mutateAsync({
        file,
        title: title.trim(),
        notes: notes.trim() || undefined,
      })
      setUploadState("success")
    } catch {
      setUploadState("error")
      setErrorMessage("Upload failed. Please check the file and try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Upload Schedule File</DialogTitle>
            <Button
              size="xs"
              variant="outline"
              onClick={downloadTemplate}
              className="mr-6"
            >
              <HugeiconsIcon
                icon={Download01Icon}
                size={12}
                strokeWidth={2}
                className="mr-1"
              />
              Download template
            </Button>
          </div>
        </DialogHeader>

        {/* Success state */}
        {uploadState === "success" ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                size={24}
                className="text-green-600 dark:text-green-400"
                strokeWidth={1.8}
              />
            </div>
            <p className="font-medium text-foreground">Upload successful</p>
            <p className="text-[13px] text-muted-foreground">
              The file is being processed. Check Upload History for status.
            </p>
            <Button
              size="sm"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Drop zone */}
            <div
              className={cn(
                "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : file
                    ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                    : "border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/60"
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) validateAndSet(f)
                }}
              />
              {file ? (
                <>
                  <HugeiconsIcon
                    icon={CheckmarkCircle01Icon}
                    size={28}
                    className="mb-2 text-green-600"
                    strokeWidth={1.5}
                  />
                  <p className="text-[13px] font-medium text-foreground">
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB — click to change
                  </p>
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={CloudUploadIcon}
                    size={28}
                    className="mb-2 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <p className="text-[13px] font-medium text-foreground">
                    Drag & drop your Excel file here
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    or click to browse — .xlsx and .xls only
                  </p>
                </>
              )}
            </div>

            {fileError && (
              <p className="flex items-center gap-1.5 text-[12px] text-red-600">
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  size={12}
                  strokeWidth={2}
                />
                {fileError}
              </p>
            )}

            {/* Metadata */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">Upload title</Label>
                <Input
                  placeholder="e.g. Schedule – Jan 2025 Week 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">
                  Notes{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  placeholder="Any context about this file version…"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Error */}
            {uploadState === "error" && (
              <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  size={13}
                  strokeWidth={2}
                />
                {errorMessage}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!file || !title.trim() || uploadState === "uploading"}
                onClick={handleUpload}
              >
                {uploadState === "uploading" ? (
                  <>
                    <HugeiconsIcon
                      icon={Refresh01Icon}
                      size={13}
                      strokeWidth={2}
                      className="mr-1.5 animate-spin"
                    />
                    Uploading…
                  </>
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={CloudUploadIcon}
                      size={13}
                      strokeWidth={2}
                      className="mr-1.5"
                    />
                    Upload file
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
