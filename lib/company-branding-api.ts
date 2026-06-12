import { api, publicApi } from "./api"

// The current tenant's WorkOS branding (wos-hr, app-owned). Images are base64 data-URLs.
// name/slug are populated only on the public by-slug read (for the branded login page).
export interface CompanyBrandingDto {
  masterImage: string | null
  logo: string | null
  favicon: string | null
  sidebarIcon: string | null
  appIcon: string | null
  accentColor: string | null
  radius: number | null
  name: string | null
  slug: string | null
}

export const companyBrandingApi = {
  // Authenticated — the editor on the My Company › Branding tab.
  getMine: () => api.get<CompanyBrandingDto>("/hr/company/branding").then((r) => r.data),
  update: (payload: CompanyBrandingDto) =>
    api.put<CompanyBrandingDto>("/hr/company/branding", payload).then((r) => r.data),
  // Public — branding for a company's login page, before anyone signs in.
  getBySlug: (slug: string) =>
    publicApi
      .get<CompanyBrandingDto>(`/hr/companies/${slug}/branding`, { skipErrorToast: true })
      .then((r) => r.data),
}

// Crop/resize produce blob: object URLs; persistence needs a data-URL. Pass-through for data-URLs
// (what the server returns) and null. Runs in the browser only.
export async function toDataUrl(url: string | null): Promise<string | null> {
  if (!url || url.startsWith("data:")) return url
  const blob = await fetch(url).then((r) => r.blob())
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
