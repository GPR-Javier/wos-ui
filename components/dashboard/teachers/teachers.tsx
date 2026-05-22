"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Search01Icon,
  Add01Icon,
  EyeIcon,
  StarIcon,
} from "@hugeicons/core-free-icons"
import { TablePagination } from "@/components/custom/table-pagination"
import { useTeachers } from "@/hooks/use-teacher"
import { cn } from "@/lib/utils"

type StatusFilter = "all" | "active" | "inactive"

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <HugeiconsIcon
        icon={StarIcon}
        size={12}
        strokeWidth={0}
        className="fill-amber-400 text-amber-400"
      />
      <span className="tabular-nums text-[13px]">{rating.toFixed(1)}</span>
    </div>
  )
}

export function TeachersSection() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data, isLoading, isError } = useTeachers({
    page: page - 1,
    size: pageSize,
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  })

  const teachers = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  const COLUMNS = [
    "Employee ID",
    "Full Name",
    "Email",
    "Contact",
    "Status",
    "Hire Date",
    "Team Leader",
    "Rating",
    "Attendance",
    "",
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            strokeWidth={2}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="pl-9"
            placeholder="Search by name, ID, or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        {/* Status filter */}
        <div className="flex rounded-lg border border-border bg-muted p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setStatusFilter(f.value)
                setPage(1)
              }}
              className={cn(
                "rounded-md px-3 py-1 text-[12px] font-medium transition-all",
                statusFilter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Button size="sm">
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          Add teacher
        </Button>
      </div>

      {isError && (
        <p className="rounded-lg border border-danger-border bg-danger-light px-4 py-3 text-[13px] text-danger">
          Failed to load teachers
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((h) => (
              <TableHead key={h} className={h === "" ? "text-right" : undefined}>
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
          ) : teachers.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No teachers found
              </TableCell>
            </TableRow>
          ) : (
            teachers.map((teacher) => {
              const initials =
                `${teacher.firstName[0] ?? ""}${teacher.lastName[0] ?? ""}`.toUpperCase()
              const fullName = `${teacher.firstName} ${teacher.lastName}`
              return (
                <TableRow key={teacher.id} className="cursor-pointer">
                  <TableCell className="tabular-nums text-muted-foreground">
                    {teacher.employeeId}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials}
                      </div>
                      <span className="font-medium">{fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {teacher.email}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {teacher.contactNumber}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={teacher.status === "active" ? "green" : "gray"}
                    >
                      {teacher.status === "active" ? "Active" : "Inactive"}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {teacher.hireDate}
                  </TableCell>
                  <TableCell>{teacher.teamLeader}</TableCell>
                  <TableCell>
                    <StarRating rating={teacher.rating} />
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "tabular-nums text-[13px] font-medium",
                        teacher.attendanceRate >= 90
                          ? "text-green-600 dark:text-green-400"
                          : teacher.attendanceRate >= 75
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {teacher.attendanceRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        router.push(`/dashboard/teachers/${teacher.id}`)
                      }
                    >
                      <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                      View details
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        setPage={setPage}
        setPageSize={setPageSize}
      />
    </div>
  )
}
