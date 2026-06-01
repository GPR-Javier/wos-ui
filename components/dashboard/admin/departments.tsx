"use client"

import { useMemo, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Cancel01Icon,
  FloppyDiskIcon,
  Search01Icon,
  CheckmarkCircle01Icon,
  Building03Icon,
  EyeIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from "@/hooks/use-employee-profile"
import type { Department } from "@/lib/employee-profile-api"

// ── Form types ────────────────────────────────────────────────────────────────

type DeptForm = { name: string; description: string; active: boolean }
type FormErrors = Partial<Record<keyof DeptForm, string>>
const EMPTY_FORM: DeptForm = { name: "", description: "", active: true }

function deptToForm(d: Department): DeptForm {
  return { name: d.name, description: d.description ?? "", active: d.active }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-medium shadow-md",
        type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      )}
    >
      <HugeiconsIcon
        icon={type === "success" ? CheckmarkCircle01Icon : Cancel01Icon}
        size={14}
        strokeWidth={2}
      />
      {msg}
    </div>
  )
}

function FieldWrap({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12px] text-muted-foreground">{label}</Label>
      {children}
      {error && (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      )}
    </div>
  )
}

// ── Department Form Modal ─────────────────────────────────────────────────────

function DeptModal({
  editingId,
  form,
  errors,
  busy,
  onClose,
  onSubmit,
  setField,
}: {
  editingId: number | null
  form: DeptForm
  errors: FormErrors
  busy: boolean
  onClose: () => void
  onSubmit: () => void
  setField: <K extends keyof DeptForm>(k: K, v: DeptForm[K]) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {editingId ? "Edit Department" : "New Department"}
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
          <FieldWrap label="Department Name *" error={errors.name}>
            <Input
              autoFocus
              className={cn(
                "h-9 text-[13px]",
                errors.name && "border-destructive"
              )}
              placeholder="e.g. Engineering, Marketing, HR"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
          </FieldWrap>

          <FieldWrap label="Description">
            <Input
              className="h-9 text-[13px]"
              placeholder="Optional short description…"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
          </FieldWrap>

          {editingId && (
            <FieldWrap label="Status">
              <select
                value={form.active ? "active" : "inactive"}
                onChange={(e) =>
                  setField("active", e.target.value === "active")
                }
                className="h-9 w-full rounded-lg border bg-background px-3 text-[13px] text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </FieldWrap>
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

// ── Main Component ────────────────────────────────────────────────────────────

export function DepartmentsSection() {
  const { data: departments = [], isLoading } = useDepartments()
  const createMut = useCreateDepartment()
  const updateMut = useUpdateDepartment()
  const deleteMut = useDeleteDepartment()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<DeptForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<
    "active" | "inactive" | "all"
  >("active")
  const [viewingItem, setViewingItem] = useState<Department | null>(null)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return departments.filter((d) => {
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.description ?? "").toLowerCase().includes(q)
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "active" ? d.active : !d.active)
      return matchSearch && matchStatus
    })
  }, [departments, search, filterStatus])

  const activeCount = departments.filter((d) => d.active).length
  const inactiveCount = departments.filter((d) => !d.active).length

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function setField<K extends keyof DeptForm>(k: K, v: DeptForm[K]) {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: undefined }))
  }

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.name.trim()) errs.name = "Department name is required"
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function toPayload(f: DeptForm, isEdit: boolean) {
    return {
      name: f.name.trim(),
      description: f.description.trim() || null,
      ...(isEdit && { active: f.active }),
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setShowForm(true)
  }

  function openEdit(d: Department) {
    setEditingId(d.id)
    setForm(deptToForm(d))
    setErrors({})
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
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
            showToast("Department updated.", "success")
          },
          onError: () =>
            showToast("Failed to update — name may already exist.", "error"),
        }
      )
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          closeForm()
          showToast("Department created.", "success")
        },
        onError: () =>
          showToast("Failed to create — name may already exist.", "error"),
      })
    }
  }

  function handleDelete(d: Department) {
    if (!confirm(`Delete "${d.name}"? This cannot be undone.`)) return
    deleteMut.mutate(d.id, {
      onSuccess: () => showToast("Department deleted.", "success"),
      onError: () => showToast("Failed to delete.", "error"),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Departments</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Manage the departments in your organization. These populate the
            Department dropdown when creating job positions.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
              {activeCount} active
            </span>
            {inactiveCount > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {inactiveCount} archived
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
          New Department
        </Button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="flex justify-end">
          <Toast msg={toast.msg} type={toast.type} />
        </div>
      )}

      {/* Filters */}
      {departments.length > 0 && (
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
              placeholder="Search department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
                    ? `Archived (${inactiveCount})`
                    : `All (${departments.length})`}
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
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card py-16 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <HugeiconsIcon
              icon={Building03Icon}
              size={22}
              strokeWidth={1.5}
              className="text-muted-foreground/60"
            />
          </div>
          <p className="text-[14px] font-semibold">No departments yet</p>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
            Add your first department to organize job positions across the
            company.
          </p>
          <Button size="sm" className="mt-5" onClick={openCreate}>
            <HugeiconsIcon
              icon={Add01Icon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            New Department
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-[13px] text-muted-foreground">
          No departments match your filters.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="divide-y divide-border/60">
            {filtered.map((d) => (
              <div
                key={d.id}
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                  !d.active && "opacity-60"
                )}
              >
                {/* Icon */}
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <HugeiconsIcon
                    icon={Building03Icon}
                    size={14}
                    strokeWidth={1.8}
                    className="text-primary"
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{d.name}</p>
                  {d.description && (
                    <p className="text-[11px] text-muted-foreground">
                      {d.description}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    d.active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {d.active ? "Active" : "Inactive"}
                </span>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    title="View"
                    onClick={() => setViewingItem(d)}
                    className="flex size-7 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    title="Edit"
                    onClick={() => openEdit(d)}
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
                    onClick={() => handleDelete(d)}
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
          <div className="border-t px-4 py-2.5 text-right text-[11px] text-muted-foreground">
            {filtered.length} of {departments.length} department
            {departments.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showForm && (
        <DeptModal
          editingId={editingId}
          form={form}
          errors={errors}
          busy={busy}
          onClose={closeForm}
          onSubmit={handleSubmit}
          setField={setField}
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
              <h2 className="text-[15px] font-semibold">Department Details</h2>
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
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{viewingItem.name}</span>
              </div>
              {viewingItem.description && (
                <div className="flex flex-col gap-1 border-b pb-2">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium">{viewingItem.description}</span>
                </div>
              )}
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
