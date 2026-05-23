"use client"

import { useMemo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  useUserRoles,
  useAccessRoles,
  useAddAccessRole,
  useRemoveAccessRole,
} from "@/hooks/use-admin-roles"
import type { UserRole, AccessRole } from "@/lib/admin-roles-api"

// ── Helpers ────────────────────────────────────────────────────────────────────

// Normalize names for comparison: lowercase, collapse spaces/underscores
function norm(s: string) {
  return s.toLowerCase().replace(/[\s_-]+/g, " ").trim()
}

function findAccessRole(
  catalog: AccessRole[],
  nameVariants: string[]
): AccessRole | null {
  for (const variant of nameVariants) {
    const found = catalog.find(
      (ar) =>
        norm(ar.pageName ?? ar.name ?? "") === norm(variant)
    )
    if (found) return found
  }
  return null
}

function resolveAssignedId(ar: unknown): number | null {
  const raw = ar as {
    accessRoleId?: number
    id?: number
    accessRole?: { id?: number; accessRoleId?: number }
  }
  return (
    raw.accessRoleId ??
    raw.id ??
    raw.accessRole?.id ??
    raw.accessRole?.accessRoleId ??
    null
  )
}

function hasAccessRole(userRole: UserRole, accessRoleId: number): boolean {
  return userRole.accessRoles.some(
    (ar) => resolveAssignedId(ar) === accessRoleId
  )
}

// ── Role toggle row ────────────────────────────────────────────────────────────

function RoleRow({
  role,
  enabled,
  disabled,
  onToggle,
}: {
  role: UserRole
  enabled: boolean
  disabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        {role.color && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: role.color }}
          />
        )}
        <div>
          <p className="text-[13px] font-medium">{role.name}</p>
          {role.description && (
            <p className="text-[11px] text-muted-foreground">
              {role.description}
            </p>
          )}
        </div>
      </div>
      <Switch
        size="sm"
        checked={enabled}
        disabled={disabled}
        onCheckedChange={onToggle}
      />
    </div>
  )
}

// ── Feature card ───────────────────────────────────────────────────────────────

interface FeatureCardProps {
  title: string
  description: string
  hint?: string
  catalogAR: AccessRole | null
  userRoles: UserRole[]
  isMutating: boolean
  onToggle: (userRoleId: number, accessRoleId: number, currentlyEnabled: boolean) => void
}

function FeatureCard({
  title,
  description,
  hint,
  catalogAR,
  userRoles,
  isMutating,
  onToggle,
}: FeatureCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <div>
        <p className="text-[13px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
        {hint && (
          <p className="mt-1 text-[11px] italic text-muted-foreground/60">
            {hint}
          </p>
        )}
      </div>

      {catalogAR === null ? (
        <p className="rounded-lg border border-dashed border-border/60 px-4 py-3 text-[12px] text-muted-foreground">
          Access role not found in the backend catalog. Check Roles &amp;
          Permissions to confirm the access role name.
        </p>
      ) : userRoles.length === 0 ? (
        <p className="text-[12px] italic text-muted-foreground">
          No user roles defined yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {userRoles.map((role) => {
            const enabled = hasAccessRole(role, catalogAR.id)
            return (
              <RoleRow
                key={role.id}
                role={role}
                enabled={enabled}
                disabled={isMutating}
                onToggle={(checked) =>
                  onToggle(role.id, catalogAR.id, checked ? false : true)
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AttendanceConfigSection() {
  const rolesQ = useUserRoles()
  const accessRolesQ = useAccessRoles()
  const addAccessRole = useAddAccessRole()
  const removeAccessRole = useRemoveAccessRole()

  const userRoles = rolesQ.data ?? []
  const catalog = accessRolesQ.data ?? []

  // "Team Attendance" — grants ATTENDANCE_MANAGEMENT:VIEW_ALL_ATTENDANCE
  // Controls "Team → Attendance" sidebar item (/dashboard/attendance).
  const teamAttendanceAR = useMemo(
    () =>
      findAccessRole(catalog, [
        "Attendance",           // current seeder pageName
        "Attendance Management",
        "Team Attendance",
      ]),
    [catalog]
  )

  // "My Attendance" — grants DTR:VIEW_ATTENDANCE
  // Controls "My Attendance" sidebar item (/dashboard/dtr).
  const dtrAR = useMemo(
    () =>
      findAccessRole(catalog, [
        "My Attendance",        // current seeder pageName
        "DTR",
        "Dtr",
      ]),
    [catalog]
  )

  const isMutating = addAccessRole.isPending || removeAccessRole.isPending

  function handleToggle(
    userRoleId: number,
    accessRoleId: number,
    currentlyEnabled: boolean
  ) {
    if (currentlyEnabled) {
      removeAccessRole.mutate({ userRoleId, accessRoleId })
    } else {
      addAccessRole.mutate({ userRoleId, accessRoleId })
    }
  }

  if (rolesQ.isLoading || accessRolesQ.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-52 rounded" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] font-semibold">Attendance configuration</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Control which user roles can access Team Attendance and My Attendance.
          Toggling a role adds or removes the corresponding sidebar item and
          page access. Changes take effect on next login.
        </p>
      </div>

      <FeatureCard
        title="Team Attendance"
        description='Controls which user roles see "Team → Attendance" in the sidebar. Toggling off removes access to the team-wide attendance monitoring view.'
        hint="Requires the Attendance Management access role to be present in the catalog."
        catalogAR={teamAttendanceAR}
        userRoles={userRoles}
        isMutating={isMutating}
        onToggle={handleToggle}
      />

      <FeatureCard
        title="My Attendance"
        description='Controls which user roles see "My Attendance" in the sidebar. Toggling off removes clock-in/out and personal DTR access.'
        hint="Requires the DTR access role to be present in the catalog."
        catalogAR={dtrAR}
        userRoles={userRoles}
        isMutating={isMutating}
        onToggle={handleToggle}
      />
    </div>
  )
}
