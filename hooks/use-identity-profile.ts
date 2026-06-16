"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  identityProfileApi,
  type EducationPayload,
  type WorkExperiencePayload,
  type CertificatePayload,
  type UpdateInfoPayload,
  type UpdateCredentialsPayload,
} from "@/lib/identity-profile-api"

const ME_KEY = ["identity-me"] as const
const EDUCATION_KEY = ["identity-education"] as const
const WORK_KEY = ["identity-work-experience"] as const
const CERTIFICATE_KEY = ["identity-certificates"] as const

// ── Account / canonical info ────────────────────────────────────────────────

export function useIdentityMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => identityProfileApi.getMe(),
  })
}

export function useUpdateIdentityInfo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateInfoPayload) =>
      identityProfileApi.updateInfo(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  })
}

export function useUpdateIdentityCredentials() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateCredentialsPayload) =>
      identityProfileApi.updateCredentials(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  })
}

export function useEducation() {
  return useQuery({
    queryKey: EDUCATION_KEY,
    queryFn: () => identityProfileApi.listEducation(),
  })
}

export function useCreateEducation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: EducationPayload) =>
      identityProfileApi.createEducation(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: EDUCATION_KEY }),
  })
}

export function useUpdateEducation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: EducationPayload }) =>
      identityProfileApi.updateEducation(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: EDUCATION_KEY }),
  })
}

export function useDeleteEducation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => identityProfileApi.deleteEducation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: EDUCATION_KEY }),
  })
}

// ── Work experience ─────────────────────────────────────────────────────────

export function useWorkExperience() {
  return useQuery({
    queryKey: WORK_KEY,
    queryFn: () => identityProfileApi.listWork(),
  })
}

export function useCreateWorkExperience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: WorkExperiencePayload) =>
      identityProfileApi.createWork(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_KEY }),
  })
}

export function useUpdateWorkExperience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: WorkExperiencePayload
    }) => identityProfileApi.updateWork(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_KEY }),
  })
}

export function useDeleteWorkExperience() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => identityProfileApi.deleteWork(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORK_KEY }),
  })
}

// ── Certificates ──────────────────────────────────────────────────────────────

export function useCertificates() {
  return useQuery({
    queryKey: CERTIFICATE_KEY,
    queryFn: () => identityProfileApi.listCertificates(),
  })
}

export function useCreateCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CertificatePayload) =>
      identityProfileApi.createCertificate(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CERTIFICATE_KEY }),
  })
}

export function useUpdateCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: CertificatePayload
    }) => identityProfileApi.updateCertificate(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CERTIFICATE_KEY }),
  })
}

export function useDeleteCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => identityProfileApi.deleteCertificate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: CERTIFICATE_KEY }),
  })
}
