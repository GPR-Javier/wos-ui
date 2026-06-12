"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { companyBrandingApi } from "@/lib/company-branding-api"
import { LoginExperience } from "@/components/auth/login-experience"

export default function BrandedLoginPage() {
  const params = useParams()
  const router = useRouter()
  const slug = String(params.slug ?? "")

  const { data: branding, isError } = useQuery({
    queryKey: ["public-branding", slug],
    queryFn: () => companyBrandingApi.getBySlug(slug),
    retry: false,
    enabled: !!slug,
  })

  // Unknown slug (no such company) → fall back to the guest login.
  useEffect(() => {
    if (isError && slug !== "guest") router.replace("/guest/login")
  }, [isError, slug, router])

  return <LoginExperience branding={branding} />
}
