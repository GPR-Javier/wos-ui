"use client"

// Templates (emails, documents, payslip format), served by wos-notification under its
// /api/notification context-path.
//
// System defaults are NOT defined here any more — they live in
// wos-notification/src/main/resources/templates/*.json and are seeded into `templates` on boot.
// Company overrides live in `template_configs`. Keeping the defaults in one place is the point:
// the editor renders whatever the backend resolves, so a change to the shipped default reaches
// every company that hasn't overridden it.
//
// The company is taken from the session cookie, so no slug is sent; callers still key their
// refetch on the slug so switching company reloads.

import { api } from "./api"
import type {
  CompanyEmailConfig,
  EmailLayout,
  ResolvedTemplate,
  TemplateKind,
} from "./template-types"

export function newId(prefix = "blk"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

/** Body accepted by PUT — mirrors the backend's SaveConfigRequest. */
interface SaveConfigBody {
  enabled: boolean
  /** Null or blank reverts the subject to the system default. */
  subject: string | null
  /** Null reverts the layout to the system default. */
  layout: EmailLayout | null
}

const BASE = "/notification/templates"

export const templateApi = {
  /** Omit `kind` for every template; pass one to scope to a single Communications tab. */
  list: (kind?: TemplateKind) =>
    api
      .get<ResolvedTemplate[]>(BASE, { params: kind ? { kind } : undefined })
      .then((r) => r.data),

  /** Resolves to undefined for an unknown key — the editor renders a "not found" state. */
  get: (key: string) =>
    api
      .get<ResolvedTemplate>(`${BASE}/${key}`, { skipErrorToast: true })
      .then((r) => r.data)
      .catch(() => undefined),

  saveConfig: (config: CompanyEmailConfig) => {
    const body: SaveConfigBody = {
      enabled: config.enabled,
      subject: config.subject,
      layout: config.layout,
    }
    return api
      .put<ResolvedTemplate>(`${BASE}/${config.templateKey}`, body)
      .then((r) => r.data)
  },

  /**
   * Toggling enabled must not clobber an existing customization, so the current subject/layout
   * are read back and sent along — the PUT writes the whole override row.
   */
  setEnabled: async (key: string, enabled: boolean) => {
    const current = await templateApi.get(key)
    if (!current) return
    await templateApi.saveConfig({ ...current.config, enabled })
  },

  /** Drops the override row entirely; the template falls back to the shipped default. */
  resetToDefault: (key: string) =>
    api.delete<ResolvedTemplate>(`${BASE}/${key}`).then((r) => r.data),
}
