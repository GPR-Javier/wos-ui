"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSlugHref } from "@/lib/slug"
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
import { Search01Icon, Add01Icon, EyeIcon } from "@hugeicons/core-free-icons"
import { TablePagination } from "@/components/custom/table-pagination"
import { useHrEmployees } from "@/hooks/use-hr"

export function EmployeesSection() {
  const router = useRouter()
  const slugHref = useSlugHref()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data, isLoading, isError } = useHrEmployees({
    page: page - 1,
    size: pageSize,
    search: search || undefined,
  })

  const employees = data?.content ?? []
  const total = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  return (
    <div className="space-y-4">
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
            placeholder="Search employees…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Button size="sm">
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          Add employee
        </Button>
      </div>

      {isError && (
        <p className="rounded-lg border border-danger-border bg-danger-light px-4 py-3 text-[13px] text-danger">
          Failed to load employees
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Employee",
              "Department",
              "Position",
              "Start date",
              "Status",
              "",
            ].map((h) => (
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
                colSpan={6}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                Loading…
              </TableCell>
            </TableRow>
          ) : employees.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="py-8 text-center text-[13px] text-muted-foreground"
              >
                No employees found
              </TableCell>
            </TableRow>
          ) : (
            employees.map((emp) => {
              const initials =
                `${emp.firstName[0] ?? ""}${emp.lastName[0] ?? ""}`.toUpperCase()
              const fullName = `${emp.firstName} ${emp.lastName}`
              return (
                <TableRow key={emp.id} className="cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                        {initials}
                      </div>
                      <div>
                        <p className="font-medium">{fullName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {emp.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {emp.department}
                  </TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {emp.startDate}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      variant={
                        emp.status === "active"
                          ? "green"
                          : emp.status === "on-leave"
                            ? "amber"
                            : "gray"
                      }
                    >
                      {emp.status === "on-leave"
                        ? "On leave"
                        : emp.status.charAt(0).toUpperCase() +
                          emp.status.slice(1)}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() =>
                        router.push(slugHref(`/dashboard/employees/${emp.id}`))
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
