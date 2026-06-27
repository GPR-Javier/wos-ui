import type { Metadata } from "next"
import { ExpenseManagementSection } from "@/components/dashboard/admin/expense-management"

export const metadata: Metadata = { title: "Expense Reports" }

export default function ExpensesPage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <ExpenseManagementSection />
    </div>
  )
}
