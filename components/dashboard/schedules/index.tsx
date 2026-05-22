"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CloudUploadIcon,
  Search01Icon,
  Cancel01Icon,
  FileExportIcon,
} from "@hugeicons/core-free-icons"
import { ScheduleUploadDialog } from "./schedule-upload-dialog"
import { ScheduleTable } from "./schedule-table"
import { ScheduleUploadHistory } from "./schedule-upload-history"
import { useScheduleVersions } from "@/hooks/use-schedule"
import { type ScheduleFilters, type ScheduleStatus } from "@/lib/schedule-api"
import { cn } from "@/lib/utils"

// ── Date preset buttons ───────────────────────────────────────────────────

type DatePreset = "today" | "yesterday" | "this-week" | "custom" | null

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "This Week", value: "this-week" },
  { label: "Custom", value: "custom" },
]

const STATUS_OPTIONS: { label: string; value: ScheduleStatus | "all" }[] = [
  { label: "All statuses", value: "all" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Ongoing", value: "ongoing" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
  { label: "No-show", value: "no-show" },
]

// ── Main component ─────────────────────────────────────────────────────────

export function SchedulesSection() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("view")

  // Version filter
  const [selectedVersionId, setSelectedVersionId] = useState<string>("latest")

  // Filters
  const [search, setSearch] = useState("")
  const [datePreset, setDatePreset] = useState<DatePreset>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [scheduleStatus, setScheduleStatus] = useState<string>("all")

  const { data: versions = [] } = useScheduleVersions()
  const activeVersion = versions.find((v) => v.status === "active")

  function clearFilters() {
    setSearch("")
    setDatePreset(null)
    setDateFrom("")
    setDateTo("")
    setScheduleStatus("all")
    setSelectedVersionId("latest")
  }

  const hasFilters =
    search ||
    datePreset ||
    dateFrom ||
    dateTo ||
    scheduleStatus !== "all" ||
    selectedVersionId !== "latest"

  const filters: ScheduleFilters = {
    versionId:
      selectedVersionId === "latest"
        ? activeVersion?.id
        : Number(selectedVersionId),
    dateFrom: datePreset === "custom" ? dateFrom || undefined : undefined,
    dateTo: datePreset === "custom" ? dateTo || undefined : undefined,
    datePreset:
      datePreset && datePreset !== "custom"
        ? (datePreset as "today" | "yesterday" | "this-week")
        : undefined,
    search: search || undefined,
    scheduleStatus: scheduleStatus !== "all" ? scheduleStatus : undefined,
  }

  function handleViewVersion(id: number) {
    setSelectedVersionId(String(id))
    setActiveTab("view")
  }

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[15px] font-semibold text-foreground">
          Schedule Management
        </h1>

        {/* Version selector */}
        <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
          <SelectTrigger className="h-8 w-56 text-[12px]">
            <SelectValue placeholder="Select file version" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest" className="text-[12px]">
              Latest active file
              {activeVersion && (
                <span className="ml-1 text-muted-foreground">
                  — {activeVersion.title}
                </span>
              )}
            </SelectItem>
            {versions.map((v) => (
              <SelectItem
                key={v.id}
                value={String(v.id)}
                className="text-[12px]"
              >
                {v.title}
                <span className="ml-1 text-muted-foreground">
                  — {v.rowCount.toLocaleString()} rows
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUploadOpen(true)}
          >
            <HugeiconsIcon
              icon={CloudUploadIcon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            Upload file
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="view" className="text-[12px]">
              Schedule View
            </TabsTrigger>
            <TabsTrigger value="history" className="text-[12px]">
              Upload History
              {versions.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-px text-[10px] font-semibold">
                  {versions.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Schedule View ── */}
        <TabsContent value="view" className="mt-4 space-y-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative min-w-0 flex-1 basis-48">
              <HugeiconsIcon
                icon={Search01Icon}
                size={13}
                strokeWidth={2}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="h-8 pl-8 text-[12px]"
                placeholder="Search teacher, student, class ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Date presets */}
            <div className="flex rounded-lg border border-border bg-muted p-0.5">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() =>
                    setDatePreset((prev) => (prev === p.value ? null : p.value))
                  }
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-medium transition-all",
                    datePreset === p.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom date range */}
            {datePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  className="h-8 w-36 text-[12px]"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="h-8 w-36 text-[12px]"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            )}

            {/* Status filter */}
            <Select value={scheduleStatus} onValueChange={setScheduleStatus}>
              <SelectTrigger className="h-8 w-36 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem
                    key={o.value}
                    value={o.value}
                    className="text-[12px]"
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Export */}
            <Button size="sm" variant="outline" className="h-8">
              <HugeiconsIcon
                icon={FileExportIcon}
                size={13}
                strokeWidth={2}
                className="mr-1"
              />
              Export
            </Button>

            {/* Clear */}
            {hasFilters && (
              <button
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={clearFilters}
              >
                <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
                Clear
              </button>
            )}
          </div>

          <ScheduleTable filters={filters} />
        </TabsContent>

        {/* ── Upload History ── */}
        <TabsContent value="history" className="mt-4">
          <ScheduleUploadHistory onViewVersion={handleViewVersion} />
        </TabsContent>
      </Tabs>

      <ScheduleUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
      />
    </div>
  )
}
