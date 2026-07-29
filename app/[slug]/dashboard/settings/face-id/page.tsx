import type { Metadata } from "next"
import { FaceEnrollmentSection } from "@/components/dashboard/settings/face-id"

export const metadata: Metadata = { title: "Face ID" }

export default function SettingsFaceIdPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <FaceEnrollmentSection />
    </div>
  )
}
