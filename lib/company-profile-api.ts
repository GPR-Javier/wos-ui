import { api } from "./api"

// The current tenant's editable company profile (wos-hr, tenant-scoped). name/slug come separately
// from gpr-auth's Company (companyApi). All fields nullable until an admin fills them in.
export interface CompanyProfile {
  tagline: string | null
  about: string | null
  industry: string | null
  founded: string | null
  companySize: string | null
  headquarters: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
}

export const companyProfileApi = {
  get: () => api.get<CompanyProfile>("/hr/company").then((r) => r.data),
  update: (payload: CompanyProfile) =>
    api.put<CompanyProfile>("/hr/company", payload).then((r) => r.data),
}
