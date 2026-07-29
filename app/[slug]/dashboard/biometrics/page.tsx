import type { Metadata } from "next"
import { BiometricsManagementSection } from "@/components/dashboard/admin/biometrics-management"

export const metadata: Metadata = { title: "Biometrics" }

export default function BiometricsPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <BiometricsManagementSection />
    </div>
  )
}
