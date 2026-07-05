"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Delete02Icon,
  PencilEdit01Icon,
  FloppyDiskIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/custom/empty-state"
import { TableSkeleton } from "@/components/custom/table-skeleton"
import { cn } from "@/lib/utils"
import {
  useReportingRoles,
  useCreateReportingRole,
  useUpdateReportingRole,
  useDeleteReportingRole,
} from "@/hooks/use-reporting-roles"
import type { ReportingRoleDTO } from "@/lib/reporting-role-api"

// ── Modal (create / rename) ────────────────────────────────────────────────

function RoleModal({
  editing,
  label,
  error,
  busy,
  onClose,
  onSubmit,
  setLabel,
}: {
  editing: boolean
  label: string
  error: string | null
  busy: boolean
  onClose: () => void
  onSubmit: () => void
  setLabel: (v: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-in rounded-2xl border border-border bg-card p-6 shadow-xl duration-200 zoom-in-95 fade-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {editing ? "Rename Reporting Role" : "New Reporting Role"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] text-muted-foreground">Label *</label>
            <Input
              autoFocus
              data-testid="reporting-role-label"
              className="h-9 text-[13px]"
              placeholder="e.g. Direct manager, Dotted-line, Project lead"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            />
            <p className="text-[11px] text-muted-foreground">
              A reporting role names the kind of line between a person and one
              of their managers (a person can report to several managers, each
              with a different role).
            </p>
          </div>

          {error && (
            <p className="text-[12px] font-medium text-destructive">{error}</p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSubmit}
            disabled={busy}
            data-testid="reporting-role-save"
          >
            <HugeiconsIcon
              icon={FloppyDiskIcon}
              size={13}
              strokeWidth={2}
              className="mr-1.5"
            />
            {busy ? "Saving…" : editing ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Section ──────────────────────────────────────────────────────────────────

export function ReportingRolesConfigSection() {
  // Include inactive so admins can reactivate; the list is sorted active-first.
  const { data: roles = [], isLoading } = useReportingRoles({
    includeInactive: true,
  })
  const createMut = useCreateReportingRole()
  const updateMut = useUpdateReportingRole()
  const deleteMut = useDeleteReportingRole()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [label, setLabel] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{
    msg: string
    type: "success" | "error"
  } | null>(null)

  const busy = createMut.isPending || updateMut.isPending || deleteMut.isPending

  const activeCount = roles.filter((r) => r.active).length
  const sorted = [...roles].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    return a.label.localeCompare(b.label)
  })

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function openCreate() {
    setEditingId(null)
    setLabel("")
    setError(null)
    setShowForm(true)
  }

  function openEdit(r: ReportingRoleDTO) {
    setEditingId(r.id)
    setLabel(r.label)
    setError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    setLabel("")
    setError(null)
  }

  function handleSubmit() {
    const trimmed = label.trim()
    if (!trimmed) {
      setError("Label is required.")
      return
    }
    setError(null)

    const onError = (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong. Please try again."
      setError(msg)
    }

    if (editingId) {
      updateMut.mutate(
        { id: editingId, body: { label: trimmed } },
        {
          onSuccess: () => {
            closeForm()
            showToast("Reporting role renamed.", "success")
          },
          onError,
        }
      )
    } else {
      createMut.mutate(
        { label: trimmed },
        {
          onSuccess: () => {
            closeForm()
            showToast("Reporting role added.", "success")
          },
          onError,
        }
      )
    }
  }

  function toggleActive(r: ReportingRoleDTO) {
    updateMut.mutate(
      { id: r.id, body: { active: !r.active } },
      {
        onSuccess: () =>
          showToast(
            r.active
              ? "Reporting role deactivated."
              : "Reporting role activated.",
            "success"
          ),
        onError: () => showToast("Failed to update.", "error"),
      }
    )
  }

  function handleDelete(r: ReportingRoleDTO) {
    if (
      !confirm(
        `Delete the "${r.label}" reporting role? Existing lines using it may be affected.`
      )
    )
      return
    deleteMut.mutate(r.id, {
      onSuccess: () => showToast("Reporting role deleted.", "success"),
      onError: () => showToast("Failed to delete.", "error"),
    })
  }

  return (
    <div className="space-y-5" data-testid="reporting-roles-config">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-semibold">Reporting Roles</p>
          <p className="mt-0.5 max-w-xl text-[12px] text-muted-foreground">
            Reporting roles label the typed lines in the org chart. A person can
            report to several managers — each line is tagged with a role (e.g.
            direct manager, dotted-line, project lead). Deactivate a role to
            hide it from new assignments without deleting existing lines.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[11px] font-medium text-green-600 dark:text-green-400">
              {activeCount} active
            </span>
            {roles.length - activeCount > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {roles.length - activeCount} inactive
              </span>
            )}
          </div>
        </div>
        <Button size="sm" onClick={openCreate} data-testid="reporting-role-new">
          <HugeiconsIcon
            icon={Add01Icon}
            size={13}
            strokeWidth={2}
            className="mr-1.5"
          />
          New Role
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

      {/* List */}
      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : roles.length === 0 ? (
        <EmptyState
          icon={
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <HugeiconsIcon
                icon={UserGroupIcon}
                size={22}
                strokeWidth={1.5}
                className="text-muted-foreground/60"
              />
            </div>
          }
          title="No reporting roles yet"
          description="Add your first reporting role to start typing the lines in your org chart."
          action={
            <Button size="sm" onClick={openCreate}>
              <HugeiconsIcon
                icon={Add01Icon}
                size={13}
                strokeWidth={2}
                className="mr-1.5"
              />
              New Role
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="divide-y divide-border/60">
            {sorted.map((r) => (
              <div
                key={r.id}
                data-testid="reporting-role-row"
                className={cn(
                  "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30",
                  !r.active && "opacity-60"
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium">{r.label}</p>
                </div>

                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
                    r.active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {r.active ? "Active" : "Inactive"}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    title={r.active ? "Deactivate" : "Activate"}
                    data-testid="reporting-role-toggle"
                    onClick={() => toggleActive(r)}
                    disabled={busy}
                    className="rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                  >
                    {r.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    title="Rename"
                    data-testid="reporting-role-edit"
                    onClick={() => openEdit(r)}
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
                    data-testid="reporting-role-delete"
                    onClick={() => handleDelete(r)}
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
      )}

      {showForm && (
        <RoleModal
          editing={!!editingId}
          label={label}
          error={error}
          busy={busy}
          onClose={closeForm}
          onSubmit={handleSubmit}
          setLabel={setLabel}
        />
      )}
    </div>
  )
}
