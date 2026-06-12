import type { Metadata } from "next"
import { MyOvertimeSection } from "@/components/dashboard/employee/my-overtime"

export const metadata: Metadata = { title: "Overtime" }

export default function MyOvertimePage() {
  return <MyOvertimeSection />
}
