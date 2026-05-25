import type { Metadata } from "next"
import { MyBusinessTripSection } from "@/components/dashboard/employee/my-business-trip"

export const metadata: Metadata = { title: "Business Trip" }

export default function MyBusinessTripPage() {
  return <MyBusinessTripSection />
}
