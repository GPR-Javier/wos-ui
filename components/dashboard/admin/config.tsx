"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { StatusBadge } from "@/components/custom/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  CheckmarkCircle01Icon,
  Add01Icon,
  PencilEdit01Icon,
  Cancel01Icon,
  Delete02Icon,
  FloppyDiskIcon,
  Search01Icon,
  Briefcase01Icon,
  EyeIcon,
  Calendar03Icon,
  Clock01Icon,
  CalendarMinus01Icon,
  Building03Icon,
  Building04Icon,
  MoneyBag02Icon,
  HelpSquareIcon,
  AiBrain01Icon,
} from "@hugeicons/core-free-icons"
import { MyCompanySection } from "@/components/dashboard/my-company"
import { SchedulePoliciesSection } from "@/components/dashboard/admin/schedule-policies"
import { AttendanceConfigSection } from "@/components/dashboard/admin/attendance-config"
import { PayrollSetupSection } from "@/components/dashboard/admin/payroll-setup"
import { DepartmentsSection } from "@/components/dashboard/admin/departments"
import { QuestionBankSection } from "@/components/dashboard/admin/question-bank"
import { AiProviderConfigSection } from "@/components/dashboard/admin/ai-provider-config"
import { useAuthStore } from "@/store/auth-store"
import {
  useJobPositions,
  useCreateJobPosition,
  useUpdateJobPosition,
  useDeleteJobPosition,
  useDepartments,
} from "@/hooks/use-employee-profile"

// ── PlaceholderSection ─────────────────────────────────────────────────────

interface PlaceholderItem {
  label: string
  value: string
  tag?: string
}

function PlaceholderSection({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: PlaceholderItem[]
}) {
  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold">{title}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {description}
          </p>
        </div>
        <Button size="xs" variant="outline" disabled>
          Edit
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between text-[13px]"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{item.value}</span>
              {item.tag && (
                <StatusBadge variant="amber" dot={false}>
                  {item.tag}
                </StatusBadge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ConfigSection ──────────────────────────────────────────────────────────

type ConfigNavItem = {
  value: string
  label: string
  icon: typeof Briefcase01Icon
}

export function ConfigSection() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const canViewSchedulePolicy = useAuthStore((s) =>
    s.authorities.includes("SCHEDULE_POLICY:VIEW")
  )
  const canEditAttendance = useAuthStore((s) =>
    s.authorities.includes("CONFIGURATION:EDIT_ATTENDANCE_SETTINGS")
  )
  const canEditLeave = useAuthStore((s) =>
    s.authorities.includes("CONFIGURATION:EDIT_LEAVE_SETTINGS")
  )
  const canManageQuestions = useAuthStore((s) =>
    s.authorities.includes("INTERVIEW_MANAGEMENT:MANAGE_QUESTIONS")
  )
  const canEditCompany = useAuthStore((s) =>
    s.authorities.includes("CONFIGURATION:EDIT_COMPANY_DETAILS")
  )
  const isAdmin = useAuthStore((s) => s.apiRole?.toUpperCase() === "ADMIN")

  const defaultTab = useMemo(() => {
    if (canViewSchedulePolicy) return "schedule"
    if (canEditAttendance) return "attendance"
    if (canEditLeave) return "leave"
    return "departments"
  }, [canViewSchedulePolicy, canEditAttendance, canEditLeave])

  const activeTab = searchParams.get("tab") ?? defaultTab

  function handleTabChange(tab: string) {
    router.replace(`/dashboard/config?tab=${tab}`)
  }

  // Categorized side-nav. Each group only renders when it has at least one permitted item.
  const navGroups: { title: string; items: ConfigNavItem[] }[] = [
    {
      title: "Company",
      items: [
        canEditCompany && {
          value: "company",
          label: "Company details",
          icon: Building04Icon,
        },
      ].filter(Boolean) as ConfigNavItem[],
    },
    {
      title: "Time & attendance",
      items: [
        canViewSchedulePolicy && {
          value: "schedule",
          label: "Schedule policy",
          icon: Calendar03Icon,
        },
        canEditAttendance && {
          value: "attendance",
          label: "Attendance",
          icon: Clock01Icon,
        },
        canEditLeave && {
          value: "leave",
          label: "Leave",
          icon: CalendarMinus01Icon,
        },
      ].filter(Boolean) as ConfigNavItem[],
    },
    {
      title: "Organization",
      items: [
        { value: "departments", label: "Departments", icon: Building03Icon },
        { value: "positions", label: "Job positions", icon: Briefcase01Icon },
      ],
    },
    {
      title: "Payroll",
      items: [
        {
          value: "payroll-setup",
          label: "Payroll setup",
          icon: MoneyBag02Icon,
        },
      ],
    },
    {
      title: "Hiring & AI",
      items: [
        canManageQuestions && {
          value: "question-bank",
          label: "Question bank",
          icon: HelpSquareIcon,
        },
        isAdmin && {
          value: "ai-provider",
          label: "AI provider",
          icon: AiBrain01Icon,
        },
      ].filter(Boolean) as ConfigNavItem[],
    },
  ].filter((g) => g.items.length > 0)

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      orientation="vertical"
      className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8"
    >
      {/* Side nav */}
      <aside className="shrink-0 lg:sticky lg:top-6 lg:w-56">
        <nav className="flex flex-col gap-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="mb-1.5 px-3 text-[10.5px] font-bold tracking-wider text-muted-foreground/60 uppercase">
                {group.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = activeTab === item.value
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => handleTabChange(item.value)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <HugeiconsIcon
                        icon={item.icon}
                        size={16}
                        strokeWidth={1.8}
                        className={
                          active ? "text-primary" : "text-muted-foreground/70"
                        }
                      />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="min-w-0 flex-1">
        {canEditCompany && (
          <TabsContent value="company">
            <MyCompanySection />
          </TabsContent>
        )}

        {canViewSchedulePolicy && (
          <TabsContent value="schedule" className="space-y-4">
            <div>
              <p className="text-[13px] font-semibold">Schedule policy</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Set the clock-in window, late grace, required hours, and
                workdays. Saves create a new immutable version — past attendance
                keeps its original snapshot.
              </p>
            </div>
            <SchedulePoliciesSection />
          </TabsContent>
        )}

        {canEditAttendance && (
          <TabsContent value="attendance">
            <AttendanceConfigSection />
          </TabsContent>
        )}

        {canEditLeave && (
          <TabsContent value="leave">
            <PlaceholderSection
              title="Leave settings"
              description="Coming soon."
              items={[
                { label: "Vacation leave accrual", value: "1.25 days/month" },
                { label: "Sick leave accrual", value: "1.25 days/month" },
                { label: "Leave carry-over", value: "10 days max" },
              ]}
            />
          </TabsContent>
        )}

        <TabsContent value="departments">
          <DepartmentsSection />
        </TabsContent>

        <TabsContent value="positions">
          <PositionsSection />
        </TabsContent>

        <TabsContent value="payroll-setup">
          <PayrollSetupSection />
        </TabsContent>

        {canManageQuestions && (
          <TabsContent value="question-bank">
            <QuestionBankSection />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="ai-provider">
            <AiProviderConfigSection />
          </TabsContent>
        )}
      </div>
    </Tabs>
  )
}

// ── Positions Management ───────────────────────────────────────────────────────

const LEVEL_OPTIONS = [
  "Junior",
  "Mid",
  "Senior",
  "Lead",
  "Principal",
  "Manager",
  "Director",
]

type PosForm = {
  title: string
  department: string
  level: string
  active: boolean
}
type PosErrors = Partial<Record<"title", string>>
const EMPTY_POS_FORM: PosForm = {
  title: "",
  department: "",
  level: "",
  active: true,
}

// ── Position Modal ─────────────────────────────────────────────────────────────

function PosModal({
  editingId,
  form,
  errors,
  busy,
  departments,
  onClose,
  onSubmit,
  setForm,
}: {
  editingId: number | null
  form: PosForm
  errors: PosErrors
  busy: boolean
  departments: { id: number; name: string; active: boolean }[]
  onClose: () => void
  onSubmit: () => void
  setForm: (v: PosForm) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {editingId ? "Edit Job Position" : "New Job Position"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">
              Position Title *
            </label>
            <Input
              autoFocus
              className={cn(
                "h-9 text-[13px]",
                errors.title && "border-destructive"
              )}
              placeholder="e.g. Software Engineer, Marketing Manager"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
            {errors.title && (
              <p className="text-[11px] font-medium text-destructive">
                {errors.title}
              </p>
            )}
          </div>

          {/* Department + Level */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Department
              </label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="">None</option>
                {departments
                  .filter((d) => d.active)
                  .map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="">None</option>
                {LEVEL_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status — edit only */}
          {editingId && (
            <div className="space-y-1.5">
              <label className="text-[12px] text-muted-foreground">
                Status
              </label>
              <select
                value={form.active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm({ ...form, active: e.target.value === "active" })
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground">* Required fields</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={onSubmit} disabled={busy}>
              <HugeiconsIcon
                icon={FloppyDiskIcon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              {busy ? "Saving…" : editingId ? "Update" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PositionsSection ───────────────────────────────────────────────────────────

function PositionsSection() {
  const { data: positions = [], isLoading } = useJobPositions()
  const { data: departments = [] } = useDepartments()
  const createMut = useCreateJobPosition()
  const updateMut = useUpdateJobPosition()
  const deleteMut = useDeleteJobPosition()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PosForm>(EMPTY_POS_FORM)
  const [errors, setErrors] = useState<PosErrors>({})
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)
  const [search, setSearch] = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterStatus, setFilterStatus] = useState<
    "active" | "inactive" | "all"
  >("active")
  const [viewingItem, setViewingItem] = useState<(typeof positions)[0] | null>(
    null
  )

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return positions.filter((p) => {
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.level ?? "").toLowerCase().includes(q)
      const matchDept = !filterDept || (p.department ?? "") === filterDept
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? p.active : !p.active)
      return matchSearch && matchDept && matchStatus
    })
  }, [positions, search, filterDept, filterStatus])

  const grouped = useMemo(() => {
    const acc: Record<string, typeof filtered> = {}
    for (const p of filtered) {
      const dept = p.department ?? "No Department"
      if (!acc[dept]) acc[dept] = []
      acc[dept]!.push(p)
    }
    return acc
  }, [filtered])

  const sortedDepts = Object.keys(grouped).sort()
  const activeCount = positions.filter((p) => p.active).length
  const inactiveCount = positions.filter((p) => !p.active).length
  const allDepts = [...new Set(positions.map((p) => p.department ?? ""))]
    .filter(Boolean)
    .sort()

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function validate(): boolean {
    const errs: PosErrors = {}
    if (!form.title.trim()) errs.title = "Position title is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function toPayload(f: PosForm, isEdit: boolean) {
    return {
      title: f.title.trim(),
      department: f.department.trim() || null,
      level: f.level || null,
      ...(isEdit && { active: f.active }),
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_POS_FORM)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(p: (typeof positions)[0]) {
    setEditingId(p.id)
    setForm({
      title: p.title,
      department: p.department ?? "",
      level: p.level ?? "",
      active: p.active,
    })
    setErrors({})
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_POS_FORM)
    setErrors({})
  }

  function handleSubmit() {
    if (!validate()) return
    const payload = toPayload(form, !!editingId)

    if (editingId) {
      updateMut.mutate(
        { id: editingId, payload },
        {
          onSuccess: () => {
            closeForm()
            showToast("Position updated.", "success")
          },
          onError: () => showToast("Failed to update position.", "error"),
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          closeForm()
          showToast("Position created.", "success")
        },
        onError: () => showToast("Failed to create position.", "error"),
      })
    }
  }

  function handleDelete(p: (typeof positions)[0]) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    deleteMut.mutate(p.id, {
      onSuccess: () => showToast("Position deleted.", "success"),
      onError: () => showToast("Failed to delete.", "error"),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Job Positions</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Configure roles and positions available in the organization.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
              {activeCount} active
            </span>
            {inactiveCount > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {inactiveCount} inactive
              </span>
            )}
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          New Position
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md",
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            )}
          >
            <HugeiconsIcon
              icon={
                toast.type === "success" ? CheckmarkCircle01Icon : Cancel01Icon
              }
              size={14}
              strokeWidth={2}
            />
            {toast.msg}
          </div>
        </div>
      )}

      {/* Filters */}
      {positions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1" style={{ minWidth: 200 }}>
            <HugeiconsIcon
              icon={Search01Icon}
              size={13}
              strokeWidth={2}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              className="h-8 pl-8 text-[13px]"
              placeholder="Search position…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {allDepts.length > 0 && (
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-8 rounded-lg border bg-background px-2.5 text-[12px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">All Departments</option>
              {allDepts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1.5">
            {(["active", "inactive", "all"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                  filterStatus === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {s === "active"
                  ? `Active (${activeCount})`
                  : s === "inactive"
                    ? `Inactive (${inactiveCount})`
                    : `All (${positions.length})`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              size={22}
              strokeWidth={1.5}
              className="text-muted-foreground/60"
            />
          </div>
          <p className="text-[14px] font-semibold">No positions yet</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
            Create your first job position to link roles to departments and
            salary grades.
          </p>
          <Button size="sm" className="mt-5" onClick={openCreate}>
            <HugeiconsIcon
              icon={Add01Icon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            New Position
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-[13px] text-muted-foreground">
          No positions match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDepts.map((dept) => (
            <div
              key={dept}
              className="overflow-hidden rounded-xl border bg-card shadow-sm"
            >
              {/* Department header */}
              <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2.5">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {dept}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {grouped[dept]!.length} position
                  {grouped[dept]!.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="divide-y divide-border/60">
                {grouped[dept]!.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                      !p.active && "opacity-60"
                    )}
                  >
                    {/* Avatar */}
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[11px] font-bold text-primary">
                      {p.title.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.level || <span className="italic">No level</span>}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                        p.active
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {p.active ? "Active" : "Inactive"}
                    </span>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        type="button"
                        title="View"
                        onClick={() => setViewingItem(p)}
                        className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon
                          icon={EyeIcon}
                          size={12}
                          strokeWidth={2}
                        />
                      </button>
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => openEdit(p)}
                        disabled={busy}
                        className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                      >
                        <HugeiconsIcon
                          icon={PencilEdit01Icon}
                          size={12}
                          strokeWidth={2}
                        />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(p)}
                        disabled={busy}
                        className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20"
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          size={12}
                          strokeWidth={2}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="text-right text-[11px] text-muted-foreground">
            {filtered.length} of {positions.length} position
            {positions.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showForm && (
        <PosModal
          editingId={editingId}
          form={form}
          errors={errors}
          busy={busy}
          departments={departments}
          onClose={closeForm}
          onSubmit={handleSubmit}
          setForm={setForm}
        />
      )}

      {/* View Modal */}
      {viewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setViewingItem(null)}
          />
          <div className="relative w-full max-w-sm animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">
                Job Position Details
              </h2>
              <button
                type="button"
                onClick={() => setViewingItem(null)}
                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
              </button>
            </div>
            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium">{viewingItem.title}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">
                  {viewingItem.department ?? "—"}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Level</span>
                <span className="font-medium">{viewingItem.level ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    viewingItem.active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {viewingItem.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
