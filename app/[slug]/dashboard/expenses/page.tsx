import type { Metadata } from "next"
import { ExpenseManagementSection } from "@/components/dashboard/admin/expense-management"

export const metadata: Metadata = { title: "Expense Reports" }

export default function ExpensesPage() {
  return <ExpenseManagementSection />
}
