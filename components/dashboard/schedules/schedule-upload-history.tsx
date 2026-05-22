"use client"

import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
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
  Download01Icon,
  CheckmarkCircle01Icon,
  Cancel01Icon,
  Refresh01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  useScheduleVersions,
  useActivateVersion,
  useArchiveVersion,
} from "@/hooks/use-schedule"
import { scheduleApi, type VersionStatus } from "@/lib/schedule-api"
import { cn } from "@/lib/utils"

function versionStatusVariant(
  s: VersionStatus
): "green" | "blue" | "gray" | "red" | "amber" {
  switch (s) {
    case "active":
      return "green"
    case "processing":
      return "blue"
    case "archived":
      return "gray"
    case "failed":
      return "red"
  }
}

function versionStatusIcon(s: VersionStatus) {
  switch (s) {
    case "active":
      return CheckmarkCircle01Icon
    case "processing":
      return Refresh01Icon
    case "archived":
      return Cancel01Icon
    case "failed":
      return Cancel01Icon
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface Props {
  onViewVersion: (id: number) => void
}

export function ScheduleUploadHistory({ onViewVersion }: Props) {
  const { data: versions = [], isLoading, isError } = useScheduleVersions()
  const activateMutation = useActivateVersion()
  const archiveMutation = useArchiveVersion()

  const COLUMNS = ["File", "Upload Date", "Uploaded By", "Rows", "Status", ""]

  return (
    <div className="space-y-4">
      {isError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Failed to load upload history
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
          ) : versions.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No files uploaded yet
              </TableCell>
            </TableRow>
          ) : (
            versions.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <p className="text-[13px] font-medium">{v.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {v.fileName}
                  </p>
                  {v.notes && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70 italic">
                      {v.notes}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-[13px] text-muted-foreground tabular-nums">
                  {formatDate(v.uploadedAt)}
                </TableCell>
                <TableCell className="text-[13px]">{v.uploadedBy}</TableCell>
                <TableCell className="text-[13px] text-muted-foreground tabular-nums">
                  {v.rowCount.toLocaleString()}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    variant={versionStatusVariant(v.status)}
                    dot={false}
                  >
                    <HugeiconsIcon
                      icon={versionStatusIcon(v.status)}
                      size={10}
                      strokeWidth={2}
                      className={cn(
                        "mr-0.5",
                        v.status === "processing" && "animate-spin"
                      )}
                    />
                    {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="xs" variant="ghost">
                        <HugeiconsIcon
                          icon={MoreHorizontalIcon}
                          size={14}
                          strokeWidth={2}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-[13px]">
                      <DropdownMenuItem onClick={() => onViewVersion(v.id)}>
                        View snapshot
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          scheduleApi.downloadVersion(v.id, v.fileName)
                        }
                      >
                        <HugeiconsIcon
                          icon={Download01Icon}
                          size={13}
                          strokeWidth={2}
                        />
                        Download original
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {v.status !== "active" && (
                        <DropdownMenuItem
                          onClick={() => activateMutation.mutate(v.id)}
                          disabled={activateMutation.isPending}
                        >
                          Set as active
                        </DropdownMenuItem>
                      )}
                      {v.status !== "archived" && (
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 dark:text-red-400"
                          onClick={() => archiveMutation.mutate(v.id)}
                          disabled={archiveMutation.isPending}
                        >
                          Archive
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
