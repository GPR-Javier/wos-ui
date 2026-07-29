"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { biometricApi, type EnrollFacePayload } from "@/lib/biometric-api"

const KEY = ["biometrics", "face"] as const

export function useMyFaceEnrollment(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => biometricApi.getMyFace(),
    enabled,
  })
}

export function useEnrollFace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: EnrollFacePayload) => biometricApi.enrollFace(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useRemoveFace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => biometricApi.removeFace(),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
