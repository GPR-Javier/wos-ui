import type { Metadata } from "next"
import { MyExpenseSection } from "@/components/dashboard/employee/my-expense"

export const metadata: Metadata = { title: "Expense Reports" }

export default function MyExpensePage() {
  return (
    <div className="animate-in p-6 duration-300 fade-in">
      <MyExpenseSection />
    </div>
  )
}
