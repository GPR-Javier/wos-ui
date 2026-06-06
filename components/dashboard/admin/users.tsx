"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Search01Icon,
  Add01Icon,
  Delete01Icon,
  UserShield01Icon,
  Alert01Icon,
  Loading03Icon,
  Clock01Icon,
  Calendar01Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TablePagination } from "@/components/custom/table-pagination"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  useAdminUsers,
  useActiveUserRoles,
  useCreateUser,
  useDeleteUser,
  useAssignRoles,
  useSetTempRoleAccess,
} from "@/hooks/use-admin-users"
import { useJobPositions } from "@/hooks/use-employee-profile"
import type {
  AdminUser,
  CreateUserPayload,
  TempRoleAccessPayload,
} from "@/lib/admin-api"

const ROLE_FILTERS = [
  { label: "All", value: undefined },
  { label: "Employee", value: "EMPLOYEE" },
  { label: "HR", value: "HR" },
  { label: "Admin", value: "ADMIN" },
]

const roleVariant = (role: string): "blue" | "purple" | "amber" => {
  const r = role.toUpperCase()
  if (r === "ADMIN") return "amber"
  if (r === "HR") return "purple"
  return "blue"
}

/** Badge pill styled with a custom hex color from the API. */
function ColoredRoleBadge({
  name,
  color,
}: {
  name: string
  color: string | null
}) {
  if (!color) {
    return (
      <StatusBadge variant="gray" dot={false}>
        {name}
      </StatusBadge>
    )
  }
  // Derive a readable text color (the hex itself) on a lightly-tinted background.
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${color}1a`, // ~10% opacity fill
        borderColor: `${color}40`, // ~25% opacity border
        color: color,
      }}
    >
      {name}
    </span>
  )
}

// ── Modals ─────────────────────────────────────────────────────────────────

function Backdrop({
  onClose,
  children,
}: {
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        {children}
      </div>
    </div>
  )
}

interface CreateModalProps {
  onClose: () => void
}
function CreateUserModal({ onClose }: CreateModalProps) {
  const createMutation = useCreateUser()
  const activeRolesQ = useActiveUserRoles()
  const { data: jobPositions = [] } = useJobPositions()
  const [roleSearch, setRoleSearch] = useState("")
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [selectedPositionIds, setSelectedPositionIds] = useState<number[]>([])
  const [form, setForm] = useState<CreateUserPayload>({
    firstName: "",
    lastName: "",
    password: "",
    userRoleIds: [],
    jobPositionIds: [],
  })

  const positionsByDept = jobPositions.reduce<
    Record<string, typeof jobPositions>
  >((acc, p) => {
    const dept = p.department ?? "General"
    if (!acc[dept]) acc[dept] = []
    acc[dept]!.push(p)
    return acc
  }, {})

  const selectedPositions = jobPositions.filter((p) =>
    selectedPositionIds.includes(p.id)
  )

  function togglePosition(id: number) {
    setSelectedPositionIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function set(k: keyof CreateUserPayload, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function handleSubmit() {
    createMutation.mutate(
      { ...form, jobPositionIds: selectedPositionIds },
      { onSuccess: onClose }
    )
  }

  function toggleRole(roleId: number) {
    setForm((f) => {
      const selected = f.userRoleIds.includes(roleId)
      return {
        ...f,
        userRoleIds: selected
          ? f.userRoleIds.filter((id) => id !== roleId)
          : [...f.userRoleIds, roleId],
      }
    })
  }

  const activeRoles = activeRolesQ.data ?? []
  const filteredRoles = activeRoles.filter((r) =>
    `${r.name} ${r.description}`
      .toLowerCase()
      .includes(roleSearch.toLowerCase())
  )
  const selectedRoles = activeRoles.filter((r) =>
    form.userRoleIds.includes(r.id)
  )

  const err = createMutation.error as {
    response?: { data?: { message?: string } }
  } | null

  return (
    <Backdrop onClose={onClose}>
      <h2 className="text-[15px] font-semibold text-foreground">
        Add System User
      </h2>
      <p className="mt-0.5 text-[12px] text-muted-foreground">
        Create a new user account.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12px]">First name</Label>
          <Input
            className="h-9 text-[13px]"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Last name</Label>
          <Input
            className="h-9 text-[13px]"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-[12px]">Password</Label>
          <Input
            className="h-9 text-[13px]"
            type="password"
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-[12px]">
            Job Position{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-[13px] transition-colors hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "truncate",
                    selectedPositionIds.length === 0 && "text-muted-foreground"
                  )}
                >
                  {selectedPositionIds.length === 0
                    ? "Select positions…"
                    : `${selectedPositionIds.length} position(s) selected`}
                </span>
                <span className="text-muted-foreground">v</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-[--radix-dropdown-menu-trigger-width] p-2"
            >
              <DropdownMenuLabel className="px-1.5 py-1 text-[11px]">
                First selected = primary position
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-48 overflow-auto">
                {jobPositions.length === 0 ? (
                  <p className="px-2 py-2 text-[12px] text-muted-foreground">
                    No positions configured.
                  </p>
                ) : (
                  Object.keys(positionsByDept)
                    .sort()
                    .map((dept) => (
                      <div key={dept}>
                        <p className="px-2 py-1 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
                          {dept}
                        </p>
                        {positionsByDept[dept]!.map((p) => (
                          <DropdownMenuCheckboxItem
                            key={p.id}
                            checked={selectedPositionIds.includes(p.id)}
                            onCheckedChange={() => togglePosition(p.id)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-[12px] font-medium">
                                {p.title}
                              </span>
                              {p.level && (
                                <span className="block text-[11px] text-muted-foreground">
                                  {p.level}
                                </span>
                              )}
                            </span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </div>
                    ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Show selected positions */}
          {selectedPositions.length > 0 && (
            <div className="space-y-1">
              {selectedPositions.map((p, i) => {
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5"
                  >
                    {i === 0 && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                        PRIMARY
                      </span>
                    )}
                    <span className="text-[12px] font-medium">{p.title}</span>
                    <button
                      type="button"
                      onClick={() => togglePosition(p.id)}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label className="text-[12px]">User Roles</Label>
          {activeRolesQ.isLoading ? (
            <div className="flex h-24 items-center justify-center rounded-md border border-border bg-muted/30 text-[12px] text-muted-foreground">
              Loading active roles...
            </div>
          ) : activeRolesQ.isError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
              Failed to load active roles.
            </div>
          ) : (
            <>
              <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-[13px] transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={cn(
                        "truncate",
                        form.userRoleIds.length === 0 && "text-muted-foreground"
                      )}
                    >
                      {form.userRoleIds.length === 0
                        ? "Select user roles"
                        : `${form.userRoleIds.length} role(s) selected`}
                    </span>
                    <span className="text-muted-foreground">v</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-[--radix-dropdown-menu-trigger-width] p-2"
                >
                  <DropdownMenuLabel className="px-1.5 py-1 text-[11px]">
                    Choose one or more roles
                  </DropdownMenuLabel>
                  <div
                    className="px-1.5 pb-2"
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <Input
                      className="h-8 text-[12px]"
                      placeholder="Search roles..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-48 overflow-auto">
                    {filteredRoles.length === 0 ? (
                      <p className="px-2 py-2 text-[12px] text-muted-foreground">
                        No matching roles.
                      </p>
                    ) : (
                      filteredRoles.map((r) => (
                        <DropdownMenuCheckboxItem
                          key={r.id}
                          checked={form.userRoleIds.includes(r.id)}
                          onCheckedChange={() => toggleRole(r.id)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-[12px] font-medium">
                              {r.name}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {r.description}
                            </span>
                          </span>
                        </DropdownMenuCheckboxItem>
                      ))
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedRoles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedRoles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => toggleRole(r.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px]"
                    >
                      {r.name}
                      <span className="text-muted-foreground">x</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <p className="text-[11px] text-muted-foreground">
            Combobox select supports multiple roles.
          </p>
        </div>
      </div>

      {err && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
          <HugeiconsIcon
            icon={Alert01Icon}
            size={13}
            strokeWidth={2}
            className="shrink-0 text-red-500"
          />
          <p className="text-[11px] text-red-700 dark:text-red-400">
            {err?.response?.data?.message ?? "Failed to create user."}
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <Button
          className="h-9 flex-1 text-[13px]"
          disabled={
            createMutation.isPending ||
            activeRolesQ.isLoading ||
            !form.firstName ||
            !form.lastName ||
            !form.password ||
            form.userRoleIds.length === 0
          }
          onClick={handleSubmit}
        >
          {createMutation.isPending ? "Creating…" : "Create user"}
        </Button>
      </div>
    </Backdrop>
  )
}

interface AssignModalProps {
  user: AdminUser
  onClose: () => void
}
function AssignRolesModal({ user, onClose }: AssignModalProps) {
  const assignMutation = useAssignRoles()
  const activeRolesQ = useActiveUserRoles()
  const [roleSearch, setRoleSearch] = useState("")
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(
    user.userRoles.map((r) => r.roleId)
  )

  function handleAssign() {
    if (!selectedRoleIds.length) return
    assignMutation.mutate(
      { id: user.id, userRoleIds: selectedRoleIds },
      { onSuccess: onClose }
    )
  }

  function toggleRole(roleId: number) {
    setSelectedRoleIds((prev) => {
      const selected = prev.includes(roleId)
      return selected ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    })
  }

  const activeRoles = activeRolesQ.data ?? []
  const filteredRoles = activeRoles.filter((r) =>
    `${r.name} ${r.description}`
      .toLowerCase()
      .includes(roleSearch.toLowerCase())
  )
  const selectedRoles = activeRoles.filter((r) =>
    selectedRoleIds.includes(r.id)
  )
  const assignErr = assignMutation.error as {
    response?: { data?: { message?: string } }
  } | null

  return (
    <Backdrop onClose={onClose}>
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
          <HugeiconsIcon
            icon={UserShield01Icon}
            size={16}
            strokeWidth={1.8}
            className="text-primary"
          />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">
            Assign Roles
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {user.firstName} {user.lastName}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          Current roles
        </p>
        <p className="mt-0.5 text-[12px] text-foreground">
          {user.userRoles.map((r) => r.roleName).join(", ") || "None"}
        </p>
      </div>

      <div className="mt-3 space-y-1.5">
        <Label className="text-[12px]">New roles</Label>
        {activeRolesQ.isLoading ? (
          <div className="flex h-24 items-center justify-center rounded-md border border-border bg-muted/30 text-[12px] text-muted-foreground">
            Loading active roles...
          </div>
        ) : activeRolesQ.isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400">
            Failed to load active roles.
          </div>
        ) : (
          <>
            <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-[13px] transition-colors hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "truncate",
                      selectedRoleIds.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {selectedRoleIds.length === 0
                      ? "Select user roles"
                      : `${selectedRoleIds.length} role(s) selected`}
                  </span>
                  <span className="text-muted-foreground">v</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width] p-2"
              >
                <DropdownMenuLabel className="px-1.5 py-1 text-[11px]">
                  Choose one or more roles
                </DropdownMenuLabel>
                <div
                  className="px-1.5 pb-2"
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Input
                    className="h-8 text-[12px]"
                    placeholder="Search roles..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                  />
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-48 overflow-auto">
                  {filteredRoles.length === 0 ? (
                    <p className="px-2 py-2 text-[12px] text-muted-foreground">
                      No matching roles.
                    </p>
                  ) : (
                    filteredRoles.map((r) => (
                      <DropdownMenuCheckboxItem
                        key={r.id}
                        checked={selectedRoleIds.includes(r.id)}
                        onCheckedChange={() => toggleRole(r.id)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-medium">
                            {r.name}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {r.description}
                          </span>
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {selectedRoles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedRoles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px]"
                  >
                    {r.name}
                    <span className="text-muted-foreground">x</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <p className="text-[11px] text-muted-foreground">
          Selecting roles here replaces the user's current roles.
        </p>
      </div>

      {assignErr && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
          <HugeiconsIcon
            icon={Alert01Icon}
            size={13}
            strokeWidth={2}
            className="shrink-0 text-red-500"
          />
          <p className="text-[11px] text-red-700 dark:text-red-400">
            {assignErr?.response?.data?.message ?? "Failed to assign roles."}
          </p>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button
          onClick={onClose}
          className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        >
          Cancel
        </button>
        <Button
          className="h-9 flex-1 text-[13px]"
          disabled={
            assignMutation.isPending ||
            activeRolesQ.isLoading ||
            selectedRoleIds.length === 0
          }
          onClick={handleAssign}
        >
          {assignMutation.isPending ? "Saving…" : "Save roles"}
        </Button>
      </div>
    </Backdrop>
  )
}

// ── Temp role helpers ──────────────────────────────────────────────────────────

function isoToDate(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.split("T")[0] ?? ""
}

function isoToTime(iso: string | null | undefined): string {
  if (!iso) return ""
  return iso.split("T")[1]?.slice(0, 5) ?? ""
}

function fmtDateBadge(startAt?: string | null, endAt?: string | null) {
  if (!startAt || !endAt) return null
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  return `${fmt(startAt)} – ${fmt(endAt)}`
}

interface TempRoleModalProps {
  user: AdminUser
  onClose: () => void
}

function TempRoleModal({ user, onClose }: TempRoleModalProps) {
  const setTempAccess = useSetTempRoleAccess()
  const activeRolesQ = useActiveUserRoles()
  const activeRoles = activeRolesQ.data ?? []

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")

  const selectedRole = activeRoles.find((r) => r.id === selectedRoleId) ?? null
  const hasTime = startTime !== "" || endTime !== ""
  const canSave = selectedRoleId !== null && startDate !== "" && endDate !== ""

  function save() {
    if (!selectedRoleId) return
    setTempAccess.mutate(
      {
        userId: user.id,
        roleId: selectedRoleId,
        payload: {
          roleId: selectedRoleId,
          startDate,
          endDate,
          startTime: startTime || null,
          endTime: endTime || null,
        },
      },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/20">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={16}
              strokeWidth={1.8}
              className="text-amber-600 dark:text-amber-400"
            />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold text-foreground">
              Assign temporary role
            </h2>
            <p className="text-[11px] text-muted-foreground">
              {user.firstName} {user.lastName}
            </p>
          </div>
        </div>

        {/* Role dropdown — all available roles */}
        <div className="mb-4 space-y-1.5">
          <Label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Role
          </Label>
          {activeRolesQ.isLoading ? (
            <div className="flex h-9 items-center rounded-md border border-border bg-muted/30 px-3 text-[12px] text-muted-foreground">
              Loading roles…
            </div>
          ) : (
            <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-left text-[13px] transition-colors hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "truncate",
                      !selectedRole && "text-muted-foreground"
                    )}
                  >
                    {selectedRole ? selectedRole.name : "Select a role"}
                  </span>
                  <span className="text-muted-foreground">v</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[--radix-dropdown-menu-trigger-width]"
              >
                <div className="max-h-48 overflow-auto">
                  {activeRoles.map((r) => {
                    const isPermanent = user.userRoles.some(
                      (ur) => ur.roleId === r.id
                    )
                    return (
                      <DropdownMenuItem
                        key={r.id}
                        disabled={isPermanent}
                        onSelect={() => {
                          setSelectedRoleId(r.id)
                          setRoleMenuOpen(false)
                        }}
                        className={cn(
                          "cursor-pointer",
                          selectedRoleId === r.id && "bg-primary/5 font-medium",
                          isPermanent && "cursor-not-allowed opacity-50"
                        )}
                      >
                        <div className="flex-1">
                          <p className="text-[12px]">{r.name}</p>
                          {r.description && (
                            <p className="text-[11px] text-muted-foreground">
                              {r.description}
                            </p>
                          )}
                        </div>
                        {isPermanent && (
                          <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                            Permanent
                          </span>
                        )}
                      </DropdownMenuItem>
                    )
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="space-y-4">
          {/* Date range */}
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Date range
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">From</Label>
                <Input
                  type="date"
                  className="h-8 text-[12px]"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Until</Label>
                <Input
                  type="date"
                  className="h-8 text-[12px]"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Time window */}
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Time window{" "}
              <span className="font-normal text-muted-foreground/70 normal-case">
                (optional)
              </span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px]">Start time</Label>
                <Input
                  type="time"
                  className="h-8 text-[12px]"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">End time</Label>
                <Input
                  type="time"
                  className="h-8 text-[12px]"
                  value={endTime}
                  min={startTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            {hasTime && (!startTime || !endTime) && (
              <p className="mt-1.5 text-[11px] text-amber-600">
                Both start and end time are required.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-[13px] font-medium transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            className="h-9 flex-1 text-[13px]"
            disabled={
              !canSave ||
              (hasTime && (!startTime || !endTime)) ||
              setTempAccess.isPending
            }
            onClick={save}
          >
            {setTempAccess.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export function UsersSection() {
  const router = useRouter()
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [assignTarget, setAssignTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [tempRoleTarget, setTempRoleTarget] = useState<AdminUser | null>(null)

  const { data, isLoading, isError } = useAdminUsers({
    page,
    size: 20,
    role: roleFilter,
  })
  const deleteMutation = useDeleteUser()

  const users = data?.content ?? []
  const filtered = search
    ? users.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email} ${u.employeeId}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : users

  function confirmDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <>
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
              className="h-9 pl-9 text-[13px]"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Role filter tabs */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  setRoleFilter(f.value)
                  setPage(0)
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors",
                  roleFilter === f.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setShowCreate(true)}
          >
            <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
            Add user
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <HugeiconsIcon
              icon={Loading03Icon}
              size={24}
              strokeWidth={1.8}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <HugeiconsIcon
              icon={Alert01Icon}
              size={24}
              strokeWidth={1.5}
              className="text-red-400"
            />
            <p className="text-[13px] text-muted-foreground">
              Failed to load users. Check the API connection.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {["User", "Employee ID", "Role", "Status", "Actions"].map(
                  (h) => (
                    <TableHead
                      key={h}
                      className={h === "Actions" ? "text-right" : undefined}
                    >
                      {h}
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-[13px] text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {u.firstName[0]}
                          {u.lastName[0]}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-muted-foreground">
                      {u.employeeId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge variant={roleVariant(u.role)} dot={false}>
                          {u.role}
                        </StatusBadge>
                        {u.userRoles.map((r) => {
                          const dateRange = fmtDateBadge(r.startAt, r.endAt)
                          const isTemp = r.temporary && !!dateRange

                          if (isTemp) {
                            return (
                              <button
                                key={r.roleId}
                                onClick={() => setTempRoleTarget(u)}
                                title={`Temporary · ${dateRange}`}
                                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 py-0.5 pr-2 pl-1.5 text-[11px] font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30"
                              >
                                <HugeiconsIcon
                                  icon={Clock01Icon}
                                  size={10}
                                  strokeWidth={2}
                                  className="shrink-0"
                                />
                                <span>{r.roleName}</span>
                                <span className="text-amber-500 dark:text-amber-500">
                                  ·
                                </span>
                                <span className="text-[10px] font-normal">
                                  {dateRange}
                                </span>
                              </button>
                            )
                          }

                          return (
                            <ColoredRoleBadge
                              key={r.roleId}
                              name={r.roleName}
                              color={r.roleColor}
                            />
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={u.active ? "green" : "gray"}>
                        {u.active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              variant="outline"
                              onClick={() =>
                                router.push(`/dashboard/employees/${u.id}`)
                              }
                            >
                              <HugeiconsIcon
                                icon={EyeIcon}
                                size={12}
                                strokeWidth={2}
                              />
                              <span className="sr-only">View details</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>View details</TooltipContent>
                        </Tooltip>
                        {u.role.toUpperCase() !== "ADMIN" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon-xs"
                                variant="outline"
                                onClick={() => setAssignTarget(u)}
                              >
                                <HugeiconsIcon
                                  icon={UserShield01Icon}
                                  size={12}
                                  strokeWidth={2}
                                />
                                <span className="sr-only">Assign roles</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Assign roles</TooltipContent>
                          </Tooltip>
                        )}
                        {u.role.toUpperCase() !== "ADMIN" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon-xs"
                                variant="outline"
                                className="border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-900/20"
                                onClick={() => setTempRoleTarget(u)}
                              >
                                <HugeiconsIcon
                                  icon={Clock01Icon}
                                  size={12}
                                  strokeWidth={2}
                                />
                                <span className="sr-only">
                                  Assign temporary role
                                </span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Assign temporary role
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-xs"
                              variant="outline"
                              className="border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
                              onClick={() => setDeleteTarget(u)}
                            >
                              <HugeiconsIcon
                                icon={Delete01Icon}
                                size={12}
                                strokeWidth={2}
                              />
                              <span className="sr-only">Delete user</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete user</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {data && (
          <TablePagination
            page={page + 1}
            totalPages={data.totalPages}
            total={data.totalElements}
            pageSize={data.size}
            setPage={(p) => setPage(p - 1)}
            setPageSize={() => {}}
          />
        )}
      </div>

      {/* ── Create user modal ── */}
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}

      {/* ── Assign roles modal ── */}
      {assignTarget && (
        <AssignRolesModal
          user={assignTarget}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {/* ── Temporary role access modal ── */}
      {tempRoleTarget && (
        <TempRoleModal
          user={tempRoleTarget}
          onClose={() => setTempRoleTarget(null)}
        />
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <Backdrop onClose={() => setDeleteTarget(null)}>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <HugeiconsIcon
                icon={Delete01Icon}
                size={18}
                strokeWidth={1.8}
                className="text-red-500"
              />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">
                Delete user?
              </h2>
              <p className="text-[12px] text-muted-foreground">
                {deleteTarget.firstName} {deleteTarget.lastName} ·{" "}
                {deleteTarget.email}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
            This will permanently remove the user and cannot be undone.
          </p>
          {deleteMutation.error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20">
              <HugeiconsIcon
                icon={Alert01Icon}
                size={13}
                strokeWidth={2}
                className="shrink-0 text-red-500"
              />
              <p className="text-[11px] text-red-700 dark:text-red-400">
                Failed to delete user.
              </p>
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex h-9 flex-1 items-center justify-center rounded-lg border border-border text-[13px] font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              variant="destructive"
              className="h-9 flex-1 text-[13px]"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Backdrop>
      )}
    </>
  )
}
