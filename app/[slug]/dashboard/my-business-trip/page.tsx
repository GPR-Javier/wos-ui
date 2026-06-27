import type { Metadata } from "next"
import { MyBusinessTripSection } from "@/components/dashboard/employee/my-business-trip"

export const metadata: Metadata = { title: "Business Trip" }

export default function MyBusinessTripPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <MyBusinessTripSection />
    </div>
  )
}
