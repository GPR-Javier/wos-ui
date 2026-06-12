import { Suspense } from "react"
import type { Metadata } from "next"
import { MyCompanySection } from "@/components/dashboard/my-company"

export const metadata: Metadata = { title: "My Company" }

export default function MyCompanyPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <Suspense>
        <MyCompanySection />
      </Suspense>
    </div>
  )
}
