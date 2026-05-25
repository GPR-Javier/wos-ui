import type { Metadata } from "next"
import { MyChangeTimeSection } from "@/components/dashboard/employee/my-change-time"

export const metadata: Metadata = { title: "Change Time In/Time Out" }

export default function MyChangeTimePage() {
  return <MyChangeTimeSection />
}
