import type { Metadata } from "next"
import { CareersPage } from "@/components/careers/careers-page"

export const metadata: Metadata = { title: "Careers" }

export default function Careers() {
  return <CareersPage />
}
