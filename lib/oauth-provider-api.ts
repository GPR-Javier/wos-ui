import { api } from "./api"

// Company-level OAuth/SSO provider config (wos-hr). The client secret is encrypted at rest and
// never returned in full — the API exposes only `hasSecret` + a masked `secretHint`.

export interface OAuthProvider {
  id: number
  provider: string
  displayName: string
  clientId: string
  hasSecret: boolean
  secretHint: string | null
  scopes: string | null
  redirectUri: string | null
  authorizationUri: string | null
  tokenUri: string | null
  userInfoUri: string | null
  iconUrl: string | null
  enabled: boolean
  updatedBy: string | null
  updatedAt: string | null
}

export interface OAuthProviderPayload {
  provider: string
  displayName: string
  clientId: string
  /** Omit/blank on update to keep the stored secret. */
  clientSecret?: string
  scopes?: string
  redirectUri?: string
  authorizationUri?: string
  tokenUri?: string
  userInfoUri?: string
  iconUrl?: string
  enabled: boolean
}

/** Public, pre-login projection — only what's needed to render a sign-in button. */
export interface PublicOAuthProvider {
  provider: string
  displayName: string
  iconUrl: string | null
}

export const oauthProviderApi = {
  list: () =>
    api.get<OAuthProvider[]>("/hr/admin/oauth-providers").then((r) => r.data),

  /** Enabled providers for a company's branded login page (no auth). */
  listPublic: (slug: string) =>
    api
      .get<PublicOAuthProvider[]>(`/hr/companies/${slug}/oauth-providers`)
      .then((r) => r.data),

  /** Confirm + link an OAuth sign-in to an existing account (unverified/untrusted path). */
  confirmLink: (payload: {
    token: string
    identifier: string
    password: string
  }) =>
    api
      .post<{
        requiresCompanySelection: boolean
        companyId: number | null
      }>("/auth/oauth/link/confirm", payload)
      .then((r) => r.data),

  /**
   * Reactivate a soft-deleted account whose ownership was just proven by an OAuth sign-in.
   * mode "recover" restores everything; "fresh" wipes the data for a clean start. The signed token
   * (from the callback) is the proof — no password needed.
   */
  reactivateConfirm: (payload: { token: string; mode: "recover" | "fresh" }) =>
    api
      .post<{
        requiresCompanySelection: boolean
        companyId: number | null
      }>("/auth/oauth/reactivate/confirm", payload)
      .then((r) => r.data),

  create: (payload: OAuthProviderPayload) =>
    api
      .post<OAuthProvider>("/hr/admin/oauth-providers", payload)
      .then((r) => r.data),

  update: (id: number, payload: OAuthProviderPayload) =>
    api
      .put<OAuthProvider>(`/hr/admin/oauth-providers/${id}`, payload)
      .then((r) => r.data),

  remove: (id: number) => api.delete(`/hr/admin/oauth-providers/${id}`),
}
