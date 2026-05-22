"use client"

import { useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Edit01Icon,
  Clock01Icon,
  Search01Icon,
  ArrowReloadHorizontalIcon,
  Delete01Icon,
  Alert01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/custom/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SchedulePolicyModal } from "@/components/custom/schedule-policy-modal"
import { PolicyHistoryModal } from "@/components/custom/policy-history-modal"
import {
  useCurrentPolicy,
  useOverrides,
  useResetPolicy,
} from "@/hooks/use-schedule-policy"
import { useUserRoles } from "@/hooks/use-admin-roles"
import { useAdminUsers } from "@/hooks/use-admin-users"
import type {
  PolicyScope,
  PolicyVersion,
  SchedulePolicyPayload,
} from "@/lib/schedule-policy-api"

// ── Confirm dialog for reset / delete ────────────────────────────────────────

type ResetTarget = {
  scope: PolicyScope
  scopeRef: number | null
  label: string
}

function ResetConfirmModal({
  target,
  onClose,
}: {
  target: ResetTarget
  onClose: () => void
}) {
  const mutation = useResetPolicy()
  const isOrg = target.scope === "ORG"
  const isUser = target.scope === "USER"
  const action = isOrg ? "Reset" : isUser ? "Delete" : "Reset"
  const verbing = mutation.isPending
    ? isUser
      ? "Deleting…"
      : "Resetting…"
    : action

  const body = isOrg
    ? `This will append a new version with the built-in defaults. Past attendance keeps its frozen snapshot — nothing is reclassified.`
    : isUser
      ? `This permanently deletes ${target.label}'s user-level override. They'll fall back to their role or the organization default starting now. Past attendance is unaffected (it keeps its snapshot).`
      : `This removes the role override entirely. Everyone in this role falls back to the organization default. Past attendance is unaffected.`

  const submit = () => {
    mutation.mutate(
      { scope: target.scope, scopeRef: target.scopeRef },
      { onSuccess: onClose }
    )
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {action} schedule policy · {target.label}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
          <HugeiconsIcon
            icon={Alert01Icon}
            size={13}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <p>{body}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant={isUser ? "destructive" : "default"}
            disabled={mutation.isPending}
            onClick={submit}
          >
            {verbing}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Compact summary card for one scope (org / role / user) ────────────────────

function ScopeRow({
  scope,
  scopeRef,
  label,
  sublabel,
  onEdit,
  onHistory,
  onReset,
}: {
  scope: PolicyScope
  scopeRef: number | null
  label: string
  sublabel?: string
  onEdit: () => void
  onHistory: () => void
  onReset?: () => void
}) {
  const q = useCurrentPolicy(scope, scopeRef)
  const canReset = onReset != null && (scope === "ORG" || q.data != null)

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[13px] font-medium">{label}</p>
          {q.data ? (
            <StatusBadge variant="green" dot={false}>
              Configured
            </StatusBadge>
          ) : (
            <StatusBadge variant="gray" dot={false}>
              Inherits
            </StatusBadge>
          )}
        </div>
        {sublabel && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{sublabel}</p>
        )}
        {q.isLoading ? (
          <Skeleton className="mt-1.5 h-3 w-48" />
        ) : q.data ? (
          <PolicySummary p={q.data.payload} />
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            No policy set at this scope — resolution falls back to a higher
            scope or system defaults.
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {canReset && (
          <Button
            size="xs"
            variant="ghost"
            onClick={onReset}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <HugeiconsIcon
              icon={ArrowReloadHorizontalIcon}
              size={12}
              strokeWidth={2}
            />
            Reset
          </Button>
        )}
        <Button
          size="xs"
          variant="ghost"
          onClick={onHistory}
          className="gap-1.5"
        >
          <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
          History
        </Button>
        <Button
          size="xs"
          variant="outline"
          onClick={onEdit}
          className="gap-1.5"
        >
          <HugeiconsIcon icon={Edit01Icon} size={12} strokeWidth={2} />
          Edit
        </Button>
      </div>
    </div>
  )
}

// ── Live list of every USER with an active override ──────────────────────────

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function UserOverridesList({
  onEdit,
  onHistory,
  onDelete,
}: {
  onEdit: (v: PolicyVersion) => void
  onHistory: (v: PolicyVersion) => void
  onDelete: (v: PolicyVersion) => void
}) {
  const q = useOverrides("USER")

  if (q.isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  const overrides = q.data ?? []
  if (overrides.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[12px] text-muted-foreground">
        No user overrides yet. Everyone is on the role or organization default.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {overrides.map((v) => {
        const p = v.payload
        return (
          <div
            key={v.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium">
                  {v.scopeRefLabel}
                </p>
                <StatusBadge variant="green" dot={false}>
                  Override
                </StatusBadge>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">
                  {p.requiredHours ?? "—"}h/day
                </span>
                {" · "}
                Clock-in {p.earliestClockIn ?? "—"}–{p.latestClockIn ?? "—"}{" "}
                (grace {p.lateGraceMins ?? 0}m)
                {" · "}
                {(p.workdays ?? []).length}/7 workdays
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Last changed {fmtDateTime(v.effectiveFrom)}
                {v.createdByName && ` · by ${v.createdByName}`}
                {v.note && ` · “${v.note}”`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onHistory(v)}
                className="gap-1.5"
              >
                <HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />
                History
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onEdit(v)}
                className="gap-1.5"
              >
                <HugeiconsIcon icon={Edit01Icon} size={12} strokeWidth={2} />
                Edit
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onDelete(v)}
                className="gap-1.5 border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20"
              >
                <HugeiconsIcon icon={Delete01Icon} size={12} strokeWidth={2} />
                Delete
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PolicySummary({ p }: { p: SchedulePolicyPayload }) {
  return (
    <p className="mt-1 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">
        {p.requiredHours ?? "—"}h/day
      </span>
      {" · "}
      Clock-in {p.earliestClockIn ?? "—"}–{p.latestClockIn ?? "—"} (grace{" "}
      {p.lateGraceMins ?? 0}m)
      {" · "}
      {(p.workdays ?? []).length}/7 workdays
    </p>
  )
}

// ── Main section ────────────────────────────────────────────────────────────

export function SchedulePoliciesSection() {
  const [editing, setEditing] = useState<{
    scope: PolicyScope
    scopeRef: number | null
    label: string
  } | null>(null)
  const [historyFor, setHistoryFor] = useState<{
    scope: PolicyScope
    scopeRef: number | null
    label: string
  } | null>(null)
  const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null)
  const [userSearch, setUserSearch] = useState("")

  const rolesQ = useUserRoles()
  const usersQ = useAdminUsers({ size: 50 })

  const filteredUsers = userSearch
    ? (usersQ.data?.content ?? []).filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email}`
          .toLowerCase()
          .includes(userSearch.toLowerCase())
      )
    : []

  return (
    <div className="space-y-6">
      {/* ── Organization-wide ────────────────────────────────────── */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-[13px] font-semibold">Organization default</p>
            <p className="text-[11px] text-muted-foreground">
              The fallback policy for every user who has no role- or user-level
              override.
            </p>
          </div>
        </div>
        <ScopeRow
          scope="ORG"
          scopeRef={null}
          label="All employees"
          onEdit={() =>
            setEditing({
              scope: "ORG",
              scopeRef: null,
              label: "Organization-wide",
            })
          }
          onHistory={() =>
            setHistoryFor({
              scope: "ORG",
              scopeRef: null,
              label: "Organization-wide",
            })
          }
          onReset={() =>
            setResetTarget({
              scope: "ORG",
              scopeRef: null,
              label: "Organization-wide",
            })
          }
        />
      </section>

      {/* ── User-role overrides ──────────────────────────────────── */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-[13px] font-semibold">Role overrides</p>
            <p className="text-[11px] text-muted-foreground">
              Override per user role. Applied to anyone holding the role; trumps
              the organization default.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {rolesQ.isLoading ? (
            <>
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </>
          ) : (
            (rolesQ.data ?? []).map((r) => (
              <ScopeRow
                key={r.id}
                scope="USER_ROLE"
                scopeRef={r.id}
                label={r.name}
                sublabel={r.description}
                onEdit={() =>
                  setEditing({
                    scope: "USER_ROLE",
                    scopeRef: r.id,
                    label: r.name,
                  })
                }
                onHistory={() =>
                  setHistoryFor({
                    scope: "USER_ROLE",
                    scopeRef: r.id,
                    label: r.name,
                  })
                }
                onReset={() =>
                  setResetTarget({
                    scope: "USER_ROLE",
                    scopeRef: r.id,
                    label: r.name,
                  })
                }
              />
            ))
          )}
        </div>
      </section>

      {/* ── User-specific overrides ──────────────────────────────── */}
      <section>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-[13px] font-semibold">User overrides</p>
            <p className="text-[11px] text-muted-foreground">
              Individuals singled out with a custom schedule. Trumps role &amp;
              org defaults.
            </p>
          </div>
        </div>

        <UserOverridesList
          onEdit={(v) =>
            setEditing({
              scope: "USER",
              scopeRef: v.scopeRef,
              label: v.scopeRefLabel,
            })
          }
          onHistory={(v) =>
            setHistoryFor({
              scope: "USER",
              scopeRef: v.scopeRef,
              label: v.scopeRefLabel,
            })
          }
          onDelete={(v) =>
            setResetTarget({
              scope: "USER",
              scopeRef: v.scopeRef,
              label: v.scopeRefLabel,
            })
          }
        />

        {/* Search-to-add: only used when admin wants to ADD an override for someone
            who doesn't have one yet. Existing overrides surface in the list above. */}
        <div className="relative mt-4 mb-2">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            strokeWidth={2}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            className="h-9 pl-9 text-[13px]"
            placeholder="Add override: search any user by name or email…"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
        </div>
        {userSearch && (
          <div className="space-y-2">
            {filteredUsers.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-[11px] text-muted-foreground">
                No matching users.
              </p>
            ) : (
              filteredUsers.slice(0, 10).map((u) => (
                <ScopeRow
                  key={u.id}
                  scope="USER"
                  scopeRef={u.id}
                  label={`${u.firstName} ${u.lastName}`}
                  sublabel={u.email}
                  onEdit={() =>
                    setEditing({
                      scope: "USER",
                      scopeRef: u.id,
                      label: `${u.firstName} ${u.lastName}`,
                    })
                  }
                  onHistory={() =>
                    setHistoryFor({
                      scope: "USER",
                      scopeRef: u.id,
                      label: `${u.firstName} ${u.lastName}`,
                    })
                  }
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Modals ───────────────────────────────────────────────── */}
      {editing && (
        <SchedulePolicyModal
          open
          scope={editing.scope}
          scopeRef={editing.scopeRef}
          scopeLabel={editing.label}
          onClose={() => setEditing(null)}
        />
      )}
      {historyFor && (
        <PolicyHistoryModal
          open
          scope={historyFor.scope}
          scopeRef={historyFor.scopeRef}
          scopeLabel={historyFor.label}
          onClose={() => setHistoryFor(null)}
        />
      )}
      {resetTarget && (
        <ResetConfirmModal
          target={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
