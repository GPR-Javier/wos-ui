import type { Metadata } from "next"
import { ComingSoon } from "@/components/custom/coming-soon"

export const metadata: Metadata = { title: "Expense Reports" }

export default function ExpensesPage() {
  return <ComingSoon title="Expense Reports" description="Review and approve employee expense report submissions." />
}
