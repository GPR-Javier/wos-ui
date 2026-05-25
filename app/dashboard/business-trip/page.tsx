import type { Metadata } from "next"
import { BusinessTripManagementSection } from "@/components/dashboard/admin/business-trip-management"

export const metadata: Metadata = { title: "Business Trip" }

export default function BusinessTripPage() {
  return <BusinessTripManagementSection />
}
