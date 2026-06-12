import type { Metadata } from "next"
import { ContractsManagement } from "@/components/dashboard/admin/contracts-management"

export const metadata: Metadata = { title: "Contracts" }

export default function ContractsPage() {
  return <ContractsManagement />
}
