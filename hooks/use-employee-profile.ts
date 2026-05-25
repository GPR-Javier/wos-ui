"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  employeeProfileApi,
  type CreateAssignmentPayload,
  type CreateKpiPayload,
  type CreateMilestonePayload,
  type CreateJobPositionPayload,
} from "@/lib/employee-profile-api"

// ── Assignments ───────────────────────────────────────────────────────────────

function assignmentKey(employeeId: number) {
  return ["employee-assignments", employeeId] as const
}

export function useEmployeeAssignments(employeeId: number) {
  return useQuery({
    queryKey: assignmentKey(employeeId),
    queryFn: () => employeeProfileApi.listAssignments(employeeId),
    enabled: employeeId > 0,
  })
}

export function useCreateAssignment(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAssignmentPayload) =>
      employeeProfileApi.createAssignment(employeeId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKey(employeeId) }),
  })
}

export function useUpdateAssignment(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
    }: {
      assignmentId: number
      payload: Partial<CreateAssignmentPayload>
    }) => employeeProfileApi.updateAssignment(employeeId, assignmentId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKey(employeeId) }),
  })
}

export function useDeleteAssignment(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: number) =>
      employeeProfileApi.deleteAssignment(employeeId, assignmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: assignmentKey(employeeId) }),
  })
}

// ── KPIs ──────────────────────────────────────────────────────────────────────

function kpiKey(employeeId: number) {
  return ["employee-kpis", employeeId] as const
}

export function useEmployeeKpis(employeeId: number) {
  return useQuery({
    queryKey: kpiKey(employeeId),
    queryFn: () => employeeProfileApi.listKpis(employeeId),
    enabled: employeeId > 0,
  })
}

export function useCreateKpi(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateKpiPayload) =>
      employeeProfileApi.createKpi(employeeId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: kpiKey(employeeId) }),
  })
}

export function useUpdateKpi(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      kpiId,
      payload,
    }: {
      kpiId: number
      payload: Partial<CreateKpiPayload>
    }) => employeeProfileApi.updateKpi(employeeId, kpiId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: kpiKey(employeeId) }),
  })
}

export function useDeleteKpi(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (kpiId: number) =>
      employeeProfileApi.deleteKpi(employeeId, kpiId),
    onSuccess: () => qc.invalidateQueries({ queryKey: kpiKey(employeeId) }),
  })
}

// ── Career Milestones ─────────────────────────────────────────────────────────

function milestoneKey(employeeId: number) {
  return ["employee-milestones", employeeId] as const
}

export function useEmployeeMilestones(employeeId: number) {
  return useQuery({
    queryKey: milestoneKey(employeeId),
    queryFn: () => employeeProfileApi.listMilestones(employeeId),
    enabled: employeeId > 0,
  })
}

export function useCreateMilestone(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMilestonePayload) =>
      employeeProfileApi.createMilestone(employeeId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(employeeId) }),
  })
}

export function useUpdateMilestone(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      milestoneId,
      payload,
    }: {
      milestoneId: number
      payload: Partial<CreateMilestonePayload>
    }) => employeeProfileApi.updateMilestone(employeeId, milestoneId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(employeeId) }),
  })
}

export function useDeleteMilestone(employeeId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (milestoneId: number) =>
      employeeProfileApi.deleteMilestone(employeeId, milestoneId),
    onSuccess: () => qc.invalidateQueries({ queryKey: milestoneKey(employeeId) }),
  })
}

// ── Job Positions ─────────────────────────────────────────────────────────────

const POSITIONS_KEY = ["job-positions"] as const

export function useJobPositions() {
  return useQuery({
    queryKey: POSITIONS_KEY,
    queryFn: () => employeeProfileApi.listPositions(),
    staleTime: 5 * 60 * 1000, // positions change rarely
  })
}

export function useCreateJobPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateJobPositionPayload) =>
      employeeProfileApi.createPosition(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: POSITIONS_KEY }),
  })
}

export function useUpdateJobPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateJobPositionPayload> }) =>
      employeeProfileApi.updatePosition(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: POSITIONS_KEY }),
  })
}

export function useDeleteJobPosition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => employeeProfileApi.deletePosition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: POSITIONS_KEY }),
  })
}
