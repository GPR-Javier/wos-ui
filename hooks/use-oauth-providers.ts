"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  oauthProviderApi,
  type OAuthProviderPayload,
} from "@/lib/oauth-provider-api"

const KEY = ["oauth-providers"] as const

export function useOAuthProviders() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => oauthProviderApi.list(),
  })
}

export function useCreateOAuthProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: OAuthProviderPayload) =>
      oauthProviderApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateOAuthProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: OAuthProviderPayload
    }) => oauthProviderApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteOAuthProvider() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => oauthProviderApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
